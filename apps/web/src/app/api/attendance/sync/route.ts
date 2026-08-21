import { prisma, AttendanceStatus, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { differenceInMinutes } from "date-fns";
import { checkRateLimit } from "@/lib/rateLimit";
import { isSignedQrPayload, verifySignedQrPayload } from "@/lib/qrCrypto";
import { logAuditEvent } from "@/lib/audit";
import { getLocalDateString, getLocalTodayDate, getLocalTimeParts, formatLocalTime } from "@/lib/dateUtils";

const SyncRecordSchema = z.object({
  id: z.string(), // ID temporal generado por el cliente
  qrToken: z.string(),
  scannedAt: z.string().datetime(), // ISO string
  mode: z.enum(["AUTO", "ENTRY", "EXIT"]).default("AUTO"),
});

const SyncSchema = z.object({
  records: z.array(SyncRecordSchema).max(50, "Máximo 50 registros por lote"),
});

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-kiosk-api-key");
    if (!apiKey) {
      return NextResponse.json({ error: "Falta la clave de autenticación del Kiosk" }, { status: 401 });
    }

    // Rate Limiting
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const rateLimitKey = `kiosk_sync:${apiKey}:${ipAddress}`;
    
    const rateResult = await checkRateLimit({ key: rateLimitKey, limit: 30, windowSeconds: 60 });
    if (!rateResult.success) {
      return NextResponse.json({ error: "Rate limit excedido" }, { status: 429 });
    }

    // Validar Kiosk
    const kiosk = await prisma.kiosk.findUnique({
      where: { apiKey },
      include: { location: { include: { organization: true } } },
    });

    if (!kiosk || !kiosk.isActive) {
      return NextResponse.json({ error: "Kiosk inactivo o inválido" }, { status: 401 });
    }

    await prisma.kiosk.update({
      where: { id: kiosk.id },
      data: { lastSeenAt: new Date(), ipAddress },
    });

    const body = await req.json();
    const parsed = SyncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.format() }, { status: 400 });
    }

    const { records } = parsed.data;
    const results: Array<{ id: string; success: boolean; error?: string; scanType?: string }> = [];

    // Procesar cada registro
    for (const record of records) {
      try {
        const rawToken = record.qrToken;
        const now = new Date(record.scannedAt); // Usamos la hora en que realmente se escaneó
        
        let searchQrToken = rawToken.trim();
        let verifiedUserId: string | undefined;

        // Verificar criptografía
        if (isSignedQrPayload(rawToken)) {
          const verification = verifySignedQrPayload(rawToken);
          if (!verification.isValid) {
            results.push({ id: record.id, success: false, error: "Firma inválida" });
            continue;
          }
          searchQrToken = verification.qrToken!;
          verifiedUserId = verification.userId;
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchQrToken);
        const userWhere: any = { organizationId: kiosk.location.organizationId, isActive: true };

        if (verifiedUserId) {
          userWhere.id = verifiedUserId;
          userWhere.qrToken = searchQrToken;
          userWhere.qrInvalidatedAt = null;
        } else if (isUuid) {
          userWhere.OR = [{ qrToken: searchQrToken, qrInvalidatedAt: null }, { documentId: searchQrToken }];
        } else {
          userWhere.documentId = searchQrToken;
        }

        const user = await prisma.user.findFirst({
          where: userWhere,
          include: {
            location: true,
            userSchedules: {
              where: { OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
              include: { schedule: true },
              take: 1,
            },
          },
        });

        if (!user) {
          results.push({ id: record.id, success: false, error: "Usuario no encontrado" });
          continue;
        }

        const isSigned = isSignedQrPayload(rawToken);
        const isQrTokenMatch = isUuid && user.qrToken && searchQrToken.toLowerCase() === user.qrToken.toLowerCase();
        const isDniScan = !isSigned && !isQrTokenMatch;

        const timezone = kiosk.location.timezone || "America/Lima";
        const today = getLocalTodayDate(now, timezone);
        const schedule = user.userSchedules?.[0]?.schedule;

        let attendance = await prisma.attendance.findUnique({
          where: { userId_date: { userId: user.id, date: today } },
        });

        let scanType = "ENTRY";
        let status: AttendanceStatus = attendance?.status || AttendanceStatus.PRESENTE;
        let lateMinutes = attendance?.lateMinutes || 0;
        let workedMinutes = attendance?.workedMinutes || 0;

        const isSplit = Boolean(schedule?.isSplit);
        const { hour: localHour, minute: localMinute } = getLocalTimeParts(now, timezone);
        const actualTotalMinutes = localHour * 60 + localMinute;

        const initialNotes = isDniScan
          ? `[OFFLINE_SYNC] Marcación manual por DNI en ${kiosk.name} a las ${formatLocalTime(now, "HH:mm:ss", timezone)}.`
          : `[OFFLINE_SYNC] Marcación por QR sincronizada. Hora real: ${formatLocalTime(now, "HH:mm:ss", timezone)}`;

        if (isSplit) {
          if (!attendance || !attendance.entryTime) {
            scanType = "ENTRY";
            let diffLate = 0;
            if (schedule) {
              const scheduledMinutes = schedule.entryHour * 60 + schedule.entryMinute;
              const diff = actualTotalMinutes - (scheduledMinutes + (schedule.toleranceMinutes || 0));
              if (diff > 0) diffLate = diff;
            }
            status = diffLate > 0 ? AttendanceStatus.TARDE : AttendanceStatus.PRESENTE;
            lateMinutes = diffLate;

            attendance = await prisma.attendance.upsert({
              where: { userId_date: { userId: user.id, date: today } },
              update: {
                entryTime: now, status, lateMinutes: diffLate > 0 ? diffLate : null,
                locationId: kiosk.locationId, kioskId: kiosk.id, notes: initialNotes,
                statusChangedBy: `KIOSK_OFFLINE_${kiosk.name}`, statusChangedAt: new Date(),
                isOfflineSync: true,
              },
              create: {
                userId: user.id, locationId: kiosk.locationId, kioskId: kiosk.id,
                date: today, entryTime: now, status, lateMinutes: diffLate > 0 ? diffLate : null,
                notes: initialNotes, statusChangedBy: `KIOSK_OFFLINE_${kiosk.name}`, statusChangedAt: new Date(),
                isOfflineSync: true,
              },
            });
          } else if (!attendance.exitTime) {
            scanType = "EXIT";
            workedMinutes = Math.max(0, differenceInMinutes(now, new Date(attendance.entryTime)));
            attendance = await prisma.attendance.update({
              where: { id: attendance.id },
              data: {
                exitTime: now, workedMinutes, notes: attendance.notes ? `${attendance.notes} | ${initialNotes}` : initialNotes,
                statusChangedBy: `KIOSK_OFFLINE_${kiosk.name}`, statusChangedAt: new Date(), isOfflineSync: true,
              },
            });
          } else if (!attendance.entryTime2) {
            scanType = "ENTRY";
            let diffLate2 = 0;
            if (schedule && schedule.entryHour2 !== null && schedule.entryHour2 !== undefined) {
              const scheduledMinutes2 = schedule.entryHour2 * 60 + (schedule.entryMinute2 || 0);
              const tolerance2 = schedule.toleranceMinutes2 ?? schedule.toleranceMinutes ?? 0;
              if (actualTotalMinutes - (scheduledMinutes2 + tolerance2) > 0) {
                diffLate2 = actualTotalMinutes - scheduledMinutes2;
              }
            }
            status = diffLate2 > 0 ? AttendanceStatus.TARDE : attendance.status;
            const totalLate = (attendance.lateMinutes || 0) + diffLate2;
            
            attendance = await prisma.attendance.update({
              where: { id: attendance.id },
              data: {
                entryTime2: now, status, lateMinutes: totalLate > 0 ? totalLate : null,
                lateMinutes2: diffLate2 > 0 ? diffLate2 : null,
                notes: attendance.notes ? `${attendance.notes} | ${initialNotes}` : initialNotes,
                statusChangedBy: `KIOSK_OFFLINE_${kiosk.name}`, statusChangedAt: new Date(), isOfflineSync: true,
              },
            });
          } else if (!attendance.exitTime2) {
            scanType = "EXIT";
            const shift1 = Math.max(0, differenceInMinutes(new Date(attendance.exitTime), new Date(attendance.entryTime)));
            const shift2 = Math.max(0, differenceInMinutes(now, new Date(attendance.entryTime2)));
            workedMinutes = shift1 + shift2;
            
            attendance = await prisma.attendance.update({
              where: { id: attendance.id },
              data: {
                exitTime2: now, workedMinutes, notes: attendance.notes ? `${attendance.notes} | ${initialNotes}` : initialNotes,
                statusChangedBy: `KIOSK_OFFLINE_${kiosk.name}`, statusChangedAt: new Date(), isOfflineSync: true,
              },
            });
          } else {
            scanType = "ALREADY_REGISTERED";
          }
        } else {
          // JORNADA CONTINUA
          const isExplicitExit = record.mode === "EXIT";

          if (!attendance || !attendance.entryTime) {
            scanType = "ENTRY";
            let diffLate = 0;
            if (schedule) {
              const scheduledMinutes = schedule.entryHour * 60 + schedule.entryMinute;
              const diff = actualTotalMinutes - (scheduledMinutes + (schedule.toleranceMinutes || 0));
              if (diff > 0) diffLate = diff;
            }
            status = diffLate > 0 ? AttendanceStatus.TARDE : AttendanceStatus.PRESENTE;
            lateMinutes = diffLate;

            attendance = await prisma.attendance.upsert({
              where: { userId_date: { userId: user.id, date: today } },
              update: {
                entryTime: now, status, lateMinutes: diffLate > 0 ? diffLate : null,
                locationId: kiosk.locationId, kioskId: kiosk.id, notes: initialNotes,
                statusChangedBy: `KIOSK_OFFLINE_${kiosk.name}`, statusChangedAt: new Date(), isOfflineSync: true,
              },
              create: {
                userId: user.id, locationId: kiosk.locationId, kioskId: kiosk.id,
                date: today, entryTime: now, status, lateMinutes: diffLate > 0 ? diffLate : null,
                notes: initialNotes, statusChangedBy: `KIOSK_OFFLINE_${kiosk.name}`, statusChangedAt: new Date(), isOfflineSync: true,
              },
            });
          } else if (!attendance.exitTime || isExplicitExit) {
            scanType = "EXIT";
            workedMinutes = Math.max(0, differenceInMinutes(now, new Date(attendance.entryTime)));
            
            attendance = await prisma.attendance.update({
              where: { id: attendance.id },
              data: {
                exitTime: now, workedMinutes,
                notes: attendance.notes ? `${attendance.notes} | ${initialNotes}` : initialNotes,
                statusChangedBy: `KIOSK_OFFLINE_${kiosk.name}`, statusChangedAt: new Date(), isOfflineSync: true,
              },
            });
          } else {
            scanType = "ALREADY_REGISTERED";
          }
        }

        await logAuditEvent({
          organizationId: kiosk.location.organizationId,
          userId: user.id, action: AuditAction.ATTENDANCE_SCANNED,
          entityType: "ATTENDANCE", entityId: attendance.id,
          newData: { scanType, status: attendance.status, isOfflineSync: true, kioskName: kiosk.name, isDniScan },
          req,
        });

        results.push({ id: record.id, success: true, scanType });
      } catch (err) {
        console.error(`Error procesando registro offline ${record.id}:`, err);
        results.push({ id: record.id, success: false, error: "Error interno procesando este registro" });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Error en sincronización offline:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
