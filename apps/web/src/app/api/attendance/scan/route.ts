import { prisma, AttendanceStatus, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { startOfDay, format, differenceInMinutes } from "date-fns";
import { checkRateLimit } from "@/lib/rateLimit";
import { isSignedQrPayload, verifySignedQrPayload } from "@/lib/qrCrypto";
import { logAuditEvent } from "@/lib/audit";

const ScanSchema = z.object({
  qrToken: z.string().min(1, "El token QR o documento es requerido"),
  mode: z.enum(["AUTO", "ENTRY", "EXIT"]).default("AUTO"),
});

// POST /api/attendance/scan
export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-kiosk-api-key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta la clave de autenticación del Kiosk (x-kiosk-api-key)" },
        { status: 401 }
      );
    }

    // ── 1. RATE LIMITING: Máximo 10 peticiones por minuto por Kiosk / IP ─────
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const rateLimitKey = `kiosk_scan:${apiKey}:${ipAddress}`;

    const rateResult = await checkRateLimit({
      key: rateLimitKey,
      limit: 10,
      windowSeconds: 60,
    });

    if (!rateResult.success) {
      return NextResponse.json(
        {
          error: "Frecuencia de escaneos excedida (máx. 10 escaneos/min por Kiosk). Por favor espera unos segundos.",
          retryAfter: rateResult.resetSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateResult.resetSeconds),
            "X-RateLimit-Limit": String(rateResult.limit),
            "X-RateLimit-Remaining": String(rateResult.remaining),
          },
        }
      );
    }

    // ── 2. Validar Kiosk ───────────────────────────────────────────────────
    const kiosk = await prisma.kiosk.findUnique({
      where: { apiKey },
      include: {
        location: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!kiosk || !kiosk.isActive) {
      return NextResponse.json(
        { error: "Dispositivo Kiosk no registrado, inactivo o clave incorrecta" },
        { status: 401 }
      );
    }

    // Actualizar heartbeat del Kiosk
    await prisma.kiosk.update({
      where: { id: kiosk.id },
      data: { lastSeenAt: new Date(), ipAddress },
    });

    // ── 3. Parsear body ────────────────────────────────────────────────────
    const body = await req.json();
    const parsed = ScanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de escaneo inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { qrToken: rawToken, mode } = parsed.data;

    // ── 4. Validación de Firma Criptográfica HMAC (si el QR está firmado) ──
    let searchQrToken = rawToken.trim();
    let verifiedUserId: string | undefined;

    if (isSignedQrPayload(rawToken)) {
      const verification = verifySignedQrPayload(rawToken);
      if (!verification.isValid) {
        return NextResponse.json(
          { error: verification.error || "Firma criptográfica del código QR inválida o alterada" },
          { status: 403 }
        );
      }
      searchQrToken = verification.qrToken!;
      verifiedUserId = verification.userId;
    }

    // ── 5. Buscar Usuario en PostgreSQL ────────────────────────────────────
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      searchQrToken
    );

    const userWhere: any = {
      organizationId: kiosk.location.organizationId,
      isActive: true,
    };

    if (verifiedUserId) {
      userWhere.id = verifiedUserId;
      userWhere.qrToken = searchQrToken;
      userWhere.qrInvalidatedAt = null;
    } else if (isUuid) {
      userWhere.OR = [
        { qrToken: searchQrToken, qrInvalidatedAt: null },
        { documentId: searchQrToken },
      ];
    } else {
      userWhere.documentId = searchQrToken;
    }

    const user = await prisma.user.findFirst({
      where: userWhere,
      include: {
        location: true,
        userSchedules: {
          where: {
            OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
          },
          include: { schedule: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Código QR no reconocido, revocado o usuario inactivo en esta organización",
        },
        { status: 404 }
      );
    }

    // ── 6. Control de Expiración por Tiempo (Máx 60 días sin renovar) ───────
    if (user.qrGeneratedAt) {
      const daysSinceGenerated =
        (Date.now() - new Date(user.qrGeneratedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceGenerated > 60) {
        return NextResponse.json(
          {
            error: "Tu credencial QR ha caducado por seguridad (> 60 días). Solicita su renovación a tu administrador.",
          },
          { status: 403 }
        );
      }
    }

    const isSigned = isSignedQrPayload(rawToken);
    const isQrTokenMatch = isUuid && user.qrToken && searchQrToken.toLowerCase() === user.qrToken.toLowerCase();
    const isDniScan = !isSigned && !isQrTokenMatch;

    const now = new Date();
    const today = startOfDay(now);
    const schedule = user.userSchedules?.[0]?.schedule;

    // ── 7. Buscar o crear asistencia del día ────────────────────────────────
    let attendance = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    });

    let scanType: "ENTRY" | "EXIT" | "ALREADY_REGISTERED" = "ENTRY";
    let message = "";
    let status: AttendanceStatus = AttendanceStatus.PRESENTE;
    let lateMinutes = 0;
    let workedMinutes = 0;

    // Determinar si es ENTRADA o SALIDA
    const isExplicitExit = mode === "EXIT";
    const isExplicitEntry = mode === "ENTRY";

    if (!attendance || !attendance.entryTime) {
      // ── CASO A: REGISTRO DE ENTRADA ──────────────────────────────────
      scanType = "ENTRY";

      // Calcular si llega a tiempo o con tardanza según el horario
      if (schedule) {
        const scheduledEntryHour = schedule.entryHour;
        const scheduledEntryMin = schedule.entryMinute;
        const tolerance = schedule.toleranceMinutes || 0;

        const scheduledTotalMinutes = scheduledEntryHour * 60 + scheduledEntryMin;
        const actualTotalMinutes = now.getHours() * 60 + now.getMinutes();

        const diff = actualTotalMinutes - (scheduledTotalMinutes + tolerance);

        if (diff > 0) {
          status = AttendanceStatus.TARDE;
          lateMinutes = actualTotalMinutes - scheduledTotalMinutes;
          message = isDniScan
            ? `¡Hola, ${user.firstName}! Entrada por DNI registrada (${format(now, "HH:mm")}, +${lateMinutes} min tarde). Pendiente de confirmación del supervisor.`
            : `¡Hola, ${user.firstName}! Entrada registrada con tardanza (+${lateMinutes} min).`;
        } else {
          status = AttendanceStatus.PRESENTE;
          message = isDniScan
            ? `¡Hola, ${user.firstName}! Entrada por DNI registrada a las ${format(now, "HH:mm")}. Pendiente de confirmación del supervisor.`
            : `¡Bienvenido(a), ${user.firstName}! Entrada registrada puntualmente.`;
        }
      } else {
        status = AttendanceStatus.PRESENTE;
        message = isDniScan
          ? `¡Hola, ${user.firstName}! Entrada por DNI registrada a las ${format(now, "HH:mm")}. Pendiente de confirmación del supervisor.`
          : `¡Bienvenido(a), ${user.firstName}! Entrada registrada con éxito.`;
      }

      const initialNotes = isDniScan
        ? `[PENDIENTE_VALIDACION_DNI] Entrada manual por DNI (${user.documentId || searchQrToken}) en ${kiosk.name} a las ${format(now, "HH:mm:ss")}.`
        : null;

      attendance = await prisma.attendance.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date: today,
          },
        },
        update: {
          entryTime: now,
          status,
          lateMinutes: lateMinutes > 0 ? lateMinutes : null,
          locationId: kiosk.locationId,
          kioskId: kiosk.id,
          notes: initialNotes,
          statusChangedBy: isDniScan ? `KIOSK_DNI_${kiosk.name}` : `KIOSK_${kiosk.name}`,
          statusChangedAt: now,
        },
        create: {
          userId: user.id,
          locationId: kiosk.locationId,
          kioskId: kiosk.id,
          date: today,
          entryTime: now,
          status,
          lateMinutes: lateMinutes > 0 ? lateMinutes : null,
          notes: initialNotes,
          statusChangedBy: isDniScan ? `KIOSK_DNI_${kiosk.name}` : `KIOSK_${kiosk.name}`,
          statusChangedAt: now,
        },
      });
    } else if (!attendance.exitTime || isExplicitExit) {
      // ── CASO B: REGISTRO DE SALIDA ───────────────────────────────────
      scanType = "EXIT";

      const entryDate = new Date(attendance.entryTime);
      workedMinutes = Math.max(0, differenceInMinutes(now, entryDate));

      const finalStatus =
        attendance.status === AttendanceStatus.TARDE
          ? AttendanceStatus.TARDE
          : AttendanceStatus.PRESENTE;

      const exitNotes = isDniScan
        ? `${attendance.notes ? attendance.notes + " | " : ""}[PENDIENTE_VALIDACION_DNI] Salida manual por DNI a las ${format(now, "HH:mm:ss")}.`
        : attendance.notes;

      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          exitTime: now,
          workedMinutes,
          status: finalStatus,
          notes: exitNotes,
          statusChangedBy: isDniScan ? `KIOSK_DNI_${kiosk.name}` : `KIOSK_${kiosk.name}`,
          statusChangedAt: now,
        },
      });

      const hours = Math.floor(workedMinutes / 60);
      const mins = workedMinutes % 60;
      const workedStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

      message = isDniScan
        ? `¡Hasta luego, ${user.firstName}! Salida por DNI registrada (${workedStr} trabajados). Pendiente de confirmación del supervisor.`
        : `¡Hasta luego, ${user.firstName}! Salida registrada. Tiempo trabajado: ${workedStr}.`;
    } else {
      // ── CASO C: YA TIENE ENTRADA Y SALIDA REGISTRADAS ─────────────────
      const diffSinceExit = differenceInMinutes(now, new Date(attendance.exitTime));
      if (diffSinceExit < 2 && !isExplicitExit) {
        scanType = "ALREADY_REGISTERED";
        message = `Tu salida ya fue registrada a las ${format(
          new Date(attendance.exitTime),
          "HH:mm"
        )}. ¡Que tengas buen descanso!`;
      } else {
        scanType = "EXIT";
        const entryDate = new Date(attendance.entryTime);
        workedMinutes = Math.max(0, differenceInMinutes(now, entryDate));

        attendance = await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            exitTime: now,
            workedMinutes,
            statusChangedBy: isDniScan ? `KIOSK_DNI_${kiosk.name}` : `KIOSK_${kiosk.name}`,
            statusChangedAt: now,
          },
        });

        message = `Salida actualizada a las ${format(now, "HH:mm")}. ¡Buen descanso!`;
      }
    }

    // ── 8. Notificar a Supervisores si la marcación fue por DNI ─────────────
    if (isDniScan && scanType !== "ALREADY_REGISTERED") {
      try {
        const supervisors = await prisma.user.findMany({
          where: {
            organizationId: kiosk.location.organizationId,
            isActive: true,
            role: { in: ["ADMIN", "SUPERVISOR", "SUPER_ADMIN"] },
            OR: [
              { locationId: null },
              { locationId: kiosk.locationId },
            ],
          },
          select: { id: true },
        });

        const notifTitle = `⚠️ Solicitud de Marcación por DNI — ${user.firstName} ${user.lastName}`;
        const notifBody = `${user.firstName} ${user.lastName} (DNI: ${user.documentId || searchQrToken}) marcó ${scanType === "ENTRY" ? "ENTRADA" : "SALIDA"} manualmente en ${kiosk.name} a las ${format(now, "HH:mm")}. Requiere confirmación de identidad.`;

        const notificationData = {
          isDniApproval: true,
          attendanceId: attendance.id,
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          userPhoto: user.photoUrl,
          documentId: user.documentId || searchQrToken,
          scanType,
          time: format(now, "HH:mm:ss"),
          locationId: kiosk.locationId,
          locationName: kiosk.location.name,
          kioskName: kiosk.name,
          proposedStatus: status,
        };

        if (supervisors.length > 0) {
          await prisma.notification.createMany({
            data: supervisors.map((sup) => ({
              userId: sup.id,
              type: "LLEGADA_TARDE", // Uso de tipo existente
              title: notifTitle,
              body: notifBody,
              data: notificationData,
            })),
          });
        }
      } catch (notifErr) {
        console.error("Error al despachar notificación de verificación DNI:", notifErr);
      }
    }

    // ── 9. Registrar Log de Auditoría ──────────────────────────────────────
    await logAuditEvent({
      organizationId: kiosk.location.organizationId,
      userId: user.id,
      action: AuditAction.ATTENDANCE_SCANNED,
      entityType: "ATTENDANCE",
      entityId: attendance.id,
      newData: {
        scanType,
        status: attendance.status,
        kioskId: kiosk.id,
        kioskName: kiosk.name,
        entryTime: attendance.entryTime,
        exitTime: attendance.exitTime,
        isSigned: isSigned,
        isDniScan,
        requiresVerification: isDniScan,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      scanType,
      message,
      requiresVerification: isDniScan,
      time: format(now, "HH:mm:ss"),
      date: format(today, "yyyy-MM-dd"),
      status: attendance.status,
      lateMinutes: attendance.lateMinutes,
      workedMinutes: attendance.workedMinutes,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        documentId: user.documentId,
        role: user.role,
        photoUrl: user.photoUrl,
        locationName: kiosk.location.name,
      },
      kiosk: {
        id: kiosk.id,
        name: kiosk.name,
      },
    });
  } catch (error: any) {
    console.error("Error en escaneo de asistencia:", error);
    return NextResponse.json(
      { error: "Error interno al procesar escaneo" },
      { status: 500 }
    );
  }
}
