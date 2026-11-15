import { prisma, AttendanceStatus, AuditAction, Prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { differenceInMinutes } from "date-fns";
import { checkRateLimit } from "@/lib/rateLimit";
import { isSignedQrPayload, verifySignedQrPayload } from "@/lib/qrCrypto";
import { logAuditEvent } from "@/lib/audit";
import { DEFAULT_TIMEZONE, getLocalTodayDate, getLocalTimeParts, formatLocalTime } from "@/lib/dateUtils";

const SyncRecordSchema = z.object({
  id: z.string(),
  qrToken: z.string(),
  scannedAt: z.string().datetime(),
  mode: z.enum(["AUTO", "ENTRY", "EXIT"]).default("AUTO"),
});

const SyncSchema = z.object({
  records: z.array(SyncRecordSchema).max(50, "Máximo 50 registros por lote"),
});

type SyncRecordInput = z.infer<typeof SyncRecordSchema>;

interface SyncResultItem {
  id: string;
  success: boolean;
  error?: string;
  scanType?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildOfflineUserWhere(
  organizationId: string,
  searchQrToken: string,
  cleanToken: string,
  isUuid: boolean,
  verifiedUserId?: string
): Prisma.UserWhereInput {
  if (verifiedUserId) {
    return {
      organizationId,
      isActive: true,
      id: verifiedUserId,
      qrToken: searchQrToken,
      qrInvalidatedAt: null,
    };
  }

  const orConditions: Prisma.UserWhereInput[] = [
    { documentId: { equals: searchQrToken, mode: "insensitive" } },
    { nfcCardUid: { equals: searchQrToken, mode: "insensitive" } },
    { nfcCardUid: { equals: cleanToken, mode: "insensitive" } },
  ];

  if (isUuid) {
    orConditions.unshift({ qrToken: searchQrToken, qrInvalidatedAt: null });
  }

  return {
    organizationId,
    isActive: true,
    OR: orConditions,
  };
}

function isOfflineDniScan(
  user: { qrToken: string | null; nfcCardUid: string | null },
  searchQrToken: string,
  cleanToken: string,
  isSigned: boolean,
  isUuid: boolean
): boolean {
  if (isSigned) return false;
  const lowerSearch = searchQrToken.toLowerCase();
  const isQrTokenMatch = Boolean(isUuid && lowerSearch === user.qrToken?.toLowerCase());
  if (isQrTokenMatch) return false;

  const nfcUid = user.nfcCardUid;
  const isNfcScan = Boolean(
    nfcUid &&
      (nfcUid.toLowerCase() === lowerSearch ||
        nfcUid.replace(/[:-\s]/g, "").toLowerCase() === cleanToken.toLowerCase())
  );
  return !isNfcScan;
}

function calculateLateDiff(
  actualTotalMinutes: number,
  entryHour?: number | null,
  entryMinute?: number | null,
  toleranceMinutes?: number | null
): number {
  if (entryHour === null || entryHour === undefined) return 0;
  const scheduledMinutes = entryHour * 60 + (entryMinute || 0);
  const diff = actualTotalMinutes - (scheduledMinutes + (toleranceMinutes || 0));
  return diff > 0 ? actualTotalMinutes - scheduledMinutes : 0;
}

function appendNote(existingNotes: string | null | undefined, newNote: string): string {
  return existingNotes ? `${existingNotes} | ${newNote}` : newNote;
}

interface OfflineShiftContext {
  userId: string;
  kioskId: string;
  kioskName: string;
  locationId: string;
  today: Date;
  now: Date;
  actualTotalMinutes: number;
  initialNotes: string;
  mode: "AUTO" | "ENTRY" | "EXIT";
  schedule?: {
    entryHour: number;
    entryMinute: number;
    toleranceMinutes: number | null;
    entryHour2: number | null;
    entryMinute2: number | null;
    toleranceMinutes2: number | null;
  } | null;
}

async function upsertInitialOfflineEntry(ctx: OfflineShiftContext) {
  const diffLate = calculateLateDiff(
    ctx.actualTotalMinutes,
    ctx.schedule?.entryHour,
    ctx.schedule?.entryMinute,
    ctx.schedule?.toleranceMinutes
  );
  const status = diffLate > 0 ? AttendanceStatus.TARDE : AttendanceStatus.PRESENTE;
  const lateMinutes = diffLate > 0 ? diffLate : null;
  const changedBy = `KIOSK_OFFLINE_${ctx.kioskName}`;

  const attendance = await prisma.attendance.upsert({
    where: { userId_date: { userId: ctx.userId, date: ctx.today } },
    update: {
      entryTime: ctx.now,
      status,
      lateMinutes,
      locationId: ctx.locationId,
      kioskId: ctx.kioskId,
      notes: ctx.initialNotes,
      statusChangedBy: changedBy,
      statusChangedAt: new Date(),
      isOfflineSync: true,
    },
    create: {
      userId: ctx.userId,
      locationId: ctx.locationId,
      kioskId: ctx.kioskId,
      date: ctx.today,
      entryTime: ctx.now,
      status,
      lateMinutes,
      notes: ctx.initialNotes,
      statusChangedBy: changedBy,
      statusChangedAt: new Date(),
      isOfflineSync: true,
    },
  });

  return { attendance, scanType: "ENTRY" };
}

async function processSplitOfflineShift(
  attendance: Awaited<ReturnType<typeof prisma.attendance.findUnique>>,
  ctx: OfflineShiftContext
) {
  if (!attendance?.entryTime) {
    return upsertInitialOfflineEntry(ctx);
  }

  const changedBy = `KIOSK_OFFLINE_${ctx.kioskName}`;

  if (!attendance.exitTime) {
    const workedMinutes = Math.max(0, differenceInMinutes(ctx.now, new Date(attendance.entryTime)));
    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        exitTime: ctx.now,
        workedMinutes,
        notes: appendNote(attendance.notes, ctx.initialNotes),
        statusChangedBy: changedBy,
        statusChangedAt: new Date(),
        isOfflineSync: true,
      },
    });
    return { attendance: updated, scanType: "EXIT" };
  }

  if (!attendance.entryTime2) {
    const tolerance2 = ctx.schedule?.toleranceMinutes2 ?? ctx.schedule?.toleranceMinutes ?? 0;
    const diffLate2 = calculateLateDiff(
      ctx.actualTotalMinutes,
      ctx.schedule?.entryHour2,
      ctx.schedule?.entryMinute2,
      tolerance2
    );
    const status = diffLate2 > 0 ? AttendanceStatus.TARDE : attendance.status;
    const totalLate = (attendance.lateMinutes || 0) + diffLate2;

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        entryTime2: ctx.now,
        status,
        lateMinutes: totalLate > 0 ? totalLate : null,
        lateMinutes2: diffLate2 > 0 ? diffLate2 : null,
        notes: appendNote(attendance.notes, ctx.initialNotes),
        statusChangedBy: changedBy,
        statusChangedAt: new Date(),
        isOfflineSync: true,
      },
    });
    return { attendance: updated, scanType: "ENTRY" };
  }

  if (!attendance.exitTime2) {
    const shift1 = Math.max(0, differenceInMinutes(new Date(attendance.exitTime), new Date(attendance.entryTime)));
    const shift2 = Math.max(0, differenceInMinutes(ctx.now, new Date(attendance.entryTime2)));
    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        exitTime2: ctx.now,
        workedMinutes: shift1 + shift2,
        notes: appendNote(attendance.notes, ctx.initialNotes),
        statusChangedBy: changedBy,
        statusChangedAt: new Date(),
        isOfflineSync: true,
      },
    });
    return { attendance: updated, scanType: "EXIT" };
  }

  return { attendance, scanType: "ALREADY_REGISTERED" };
}

async function processContinuousOfflineShift(
  attendance: Awaited<ReturnType<typeof prisma.attendance.findUnique>>,
  ctx: OfflineShiftContext
) {
  if (!attendance?.entryTime) {
    return upsertInitialOfflineEntry(ctx);
  }

  if (!attendance.exitTime || ctx.mode === "EXIT") {
    const workedMinutes = Math.max(0, differenceInMinutes(ctx.now, new Date(attendance.entryTime)));
    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        exitTime: ctx.now,
        workedMinutes,
        notes: appendNote(attendance.notes, ctx.initialNotes),
        statusChangedBy: `KIOSK_OFFLINE_${ctx.kioskName}`,
        statusChangedAt: new Date(),
        isOfflineSync: true,
      },
    });
    return { attendance: updated, scanType: "EXIT" };
  }

  return { attendance, scanType: "ALREADY_REGISTERED" };
}

async function processSingleSyncRecord(
  record: SyncRecordInput,
  kiosk: {
    id: string;
    name: string;
    locationId: string;
    location: { organizationId: string; timezone: string | null };
  },
  req: Request
): Promise<SyncResultItem> {
  const now = new Date(record.scannedAt);
  let searchQrToken = record.qrToken.trim();
  let verifiedUserId: string | undefined;

  if (isSignedQrPayload(searchQrToken)) {
    const verification = verifySignedQrPayload(searchQrToken, 90, undefined, now);
    if (!verification.isValid) {
      return { id: record.id, success: false, error: "Firma inválida o expirada al momento del escaneo" };
    }
    searchQrToken = verification.qrToken;
    verifiedUserId = verification.userId;
  }

  const isUuid = UUID_REGEX.test(searchQrToken);
  const cleanToken = searchQrToken.replace(/[:-\s]/g, "");
  const userWhere = buildOfflineUserWhere(
    kiosk.location.organizationId,
    searchQrToken,
    cleanToken,
    isUuid,
    verifiedUserId
  );

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
    return { id: record.id, success: false, error: "Usuario no encontrado" };
  }

  const isSigned = isSignedQrPayload(record.qrToken.trim());
  const isDniScan = isOfflineDniScan(user, searchQrToken, cleanToken, isSigned, isUuid);
  const timezone = kiosk.location.timezone || DEFAULT_TIMEZONE;
  const today = getLocalTodayDate(now, timezone);
  const schedule = user.userSchedules?.[0]?.schedule;

  const existingAttendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
  });

  const { hour: localHour, minute: localMinute } = getLocalTimeParts(now, timezone);
  const formattedTime = formatLocalTime(now, "HH:mm:ss", timezone);
  const initialNotes = isDniScan
    ? `[OFFLINE_SYNC] Marcación manual por DNI en ${kiosk.name} a las ${formattedTime}.`
    : `[OFFLINE_SYNC] Marcación por QR sincronizada. Hora real: ${formattedTime}`;

  const shiftCtx: OfflineShiftContext = {
    userId: user.id,
    kioskId: kiosk.id,
    kioskName: kiosk.name,
    locationId: kiosk.locationId,
    today,
    now,
    actualTotalMinutes: localHour * 60 + localMinute,
    initialNotes,
    mode: record.mode,
    schedule,
  };

  const { attendance, scanType } = schedule?.isSplit
    ? await processSplitOfflineShift(existingAttendance, shiftCtx)
    : await processContinuousOfflineShift(existingAttendance, shiftCtx);

  await logAuditEvent({
    organizationId: kiosk.location.organizationId,
    userId: user.id,
    action: AuditAction.ATTENDANCE_SCANNED,
    entityType: "ATTENDANCE",
    entityId: attendance.id,
    newData: { scanType, status: attendance.status, isOfflineSync: true, kioskName: kiosk.name, isDniScan },
    req,
  });

  return { id: record.id, success: true, scanType };
}

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-kiosk-api-key");
    if (!apiKey) {
      return NextResponse.json({ error: "Falta la clave de autenticación del Kiosk" }, { status: 401 });
    }

    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const rateLimitKey = `kiosk_sync:${apiKey}:${ipAddress}`;

    const rateResult = await checkRateLimit({ key: rateLimitKey, limit: 30, windowSeconds: 60 });
    if (!rateResult.success) {
      return NextResponse.json({ error: "Rate limit excedido" }, { status: 429 });
    }

    const kiosk = await prisma.kiosk.findUnique({
      where: { apiKey },
      include: { location: { include: { organization: true } } },
    });

    if (!kiosk?.isActive) {
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

    const results = await parsed.data.records.reduce<Promise<SyncResultItem[]>>(
      async (accPromise, record) => {
        const acc = await accPromise;
        try {
          const res = await processSingleSyncRecord(record, kiosk, req);
          acc.push(res);
        } catch (err) {
          console.error(`Error procesando registro offline ${record.id}:`, err);
          acc.push({ id: record.id, success: false, error: "Error interno procesando este registro" });
        }
        return acc;
      },
      Promise.resolve([])
    );

    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    console.error("Error en sincronización offline:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
