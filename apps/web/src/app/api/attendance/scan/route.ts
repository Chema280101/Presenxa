import { prisma, AttendanceStatus, AuditAction, Prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { differenceInMinutes } from "date-fns";
import { checkRateLimit } from "@/lib/rateLimit";
import { isSignedQrPayload, verifySignedQrPayload } from "@/lib/qrCrypto";
import { logAuditEvent } from "@/lib/audit";
import {
  DEFAULT_TIMEZONE,
  getLocalDateString,
  getLocalTodayDate,
  getLocalTimeParts,
  formatLocalTime,
  computeOvertime,
} from "@/lib/dateUtils";
import {
  computeEntryDelayMinutes,
  fetchEffectiveScheduleForUserDate,
  isOvernightSchedule,
} from "@/lib/scheduleResolver";
import { offloadDataUrlIfConfigured } from "@/lib/storage";
import { generateMicroInteraction } from "@/lib/microInteractions";
import { checkToleranceWeeklyLimit } from "@/lib/toleranceChecker";
import { sendPushToSupervisors } from "@/lib/webPush";
import { notifySupervisorsInOrg, notifyUserWithPush } from "@/lib/notifications";

const ScanSchema = z.object({
  qrToken: z.string().min(1, "El token QR o documento es requerido"),
  mode: z.enum(["AUTO", "ENTRY", "EXIT"]).default("AUTO"),
  verificationPhotoUrl: z.string().optional().nullable(),
});

type ScanType = "ENTRY" | "EXIT" | "ALREADY_REGISTERED";
type AttendanceRecord = NonNullable<Awaited<ReturnType<typeof prisma.attendance.findUnique>>>;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatWorkedDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
}

function appendDniNote(existingNotes: string | null | undefined, dniNote: string, isDniScan: boolean): string | null {
  if (!isDniScan) return existingNotes ?? null;
  return existingNotes ? `${existingNotes} | ${dniNote}` : dniNote;
}

function resolveScanMethodLabel(isNfcScan: boolean, isSigned: boolean, isDniScan: boolean): string {
  if (isNfcScan) return "NFC";
  if (isSigned) return "QR_SECURE";
  if (isDniScan) return "MANUAL_DNI";
  return "QR_STANDARD";
}

function buildScanUserWhere(
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

function classifyScanCredentials(
  user: { qrToken: string | null; nfcCardUid: string | null },
  rawInputToken: string,
  searchQrToken: string,
  cleanToken: string,
  isUuid: boolean
) {
  const isSigned = isSignedQrPayload(rawInputToken);
  const lowerSearch = searchQrToken.toLowerCase();
  const isQrTokenMatch = Boolean(isUuid && lowerSearch === user.qrToken?.toLowerCase());
  const nfcUid = user.nfcCardUid;
  const isNfcScan = Boolean(
    !isSigned &&
      !isQrTokenMatch &&
      nfcUid &&
      (nfcUid.toLowerCase() === lowerSearch ||
        nfcUid.replace(/[:-\s]/g, "").toLowerCase() === cleanToken.toLowerCase())
  );
  const isDniScan = !isSigned && !isQrTokenMatch && !isNfcScan;

  return { isSigned, isQrTokenMatch, isNfcScan, isDniScan };
}

async function findRecentAccidentalExit(userId: string, now: Date, timezone: string) {
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
  const recentExit = await prisma.attendance.findFirst({
    where: {
      userId,
      OR: [{ exitTime: { gte: twoMinutesAgo } }, { exitTime2: { gte: twoMinutesAgo } }],
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!recentExit) return null;

  const hasBothExits = Boolean(recentExit.exitTime2 && recentExit.exitTime);
  const exit2Date = recentExit.exitTime2 ?? now;
  const exit1Date = recentExit.exitTime ?? now;
  const lastExitDate =
    hasBothExits && exit2Date >= exit1Date
      ? recentExit.exitTime2
      : recentExit.exitTime2 || recentExit.exitTime;

  const message = `Tu salida ya fue registrada a las ${formatLocalTime(
    lastExitDate || now,
    "HH:mm",
    timezone
  )}. ¡Que tengas buen descanso!`;

  return { attendance: recentExit, message };
}

function findOpenOvernightShift(userId: string, now: Date) {
  const sixteenHoursAgo = new Date(now.getTime() - 16 * 60 * 60 * 1000);
  return prisma.attendance.findFirst({
    where: {
      userId,
      entryTime: { gte: sixteenHoursAgo },
      OR: [{ exitTime: null }, { entryTime2: { not: null }, exitTime2: null }],
    },
    orderBy: { entryTime: "desc" },
  });
}

interface ShiftExecutionContext {
  user: { id: string; firstName: string; lastName: string; documentId: string | null };
  kiosk: {
    id: string;
    name: string;
    locationId: string;
    location: {
      organizationId: string;
      organization?: { settings: unknown } | null;
    };
  };
  schedule?: {
    isSplit?: boolean;
    entryHour: number;
    entryMinute: number;
    exitHour: number;
    exitMinute: number;
    toleranceMinutes: number | null;
    entryHour2: number | null;
    entryMinute2: number | null;
    exitHour2: number | null;
    exitMinute2: number | null;
    toleranceMinutes2: number | null;
  } | null;
  today: Date;
  shiftDateStr: string;
  now: Date;
  timezone: string;
  localTimeFormatted: string;
  actualTotalMinutes: number;
  isDniScan: boolean;
  initialDniNotes: string | null;
  mode: "AUTO" | "ENTRY" | "EXIT";
  changedBy: string;
}

interface ShiftExecutionResult {
  attendance: AttendanceRecord;
  scanType: ScanType;
  status: AttendanceStatus;
  message: string;
}

function resolveOrgSettings(settings: unknown): {
  toleranceMinutes: number;
  timezone: string | null;
} {
  if (!settings || typeof settings !== "object") {
    return { toleranceMinutes: 0, timezone: null };
  }
  const s = settings as Record<string, unknown>;
  const toleranceMinutes = typeof s.tolerance_minutes === "number" && Number.isFinite(s.tolerance_minutes)
    ? Math.max(0, s.tolerance_minutes)
    : 0;
  const timezone = typeof s.timezone === "string" && s.timezone.trim() ? s.timezone.trim() : null;
  return { toleranceMinutes, timezone };
}

function resolveToleranceMinutes(scheduleTolerance: number | null | undefined, orgSettings: unknown): number {
  if (typeof scheduleTolerance === "number" && Number.isFinite(scheduleTolerance)) {
    return scheduleTolerance;
  }
  return resolveOrgSettings(orgSettings).toleranceMinutes;
}

async function notifyToleranceAlert(params: {
  organizationId: string;
  user: { id: string; firstName: string; lastName: string };
  exceededTolerance: boolean;
  isLastTolerance: boolean;
}): Promise<void> {
  if (params.exceededTolerance) {
    await notifySupervisorsInOrg({
      organizationId: params.organizationId,
      type: "LLEGADA_TARDE",
      title: "Límite de Tolerancia",
      body: `${params.user.firstName} ${params.user.lastName} ha excedido las tolerancias semanales permitidas.`,
      url: "/asistencias",
      tag: `tolerance-limit-${params.user.id}`,
      data: { category: "TOLERANCE_EXCEEDED", userId: params.user.id },
    });
  } else if (params.isLastTolerance) {
    await notifyUserWithPush({
      userId: params.user.id,
      type: "LLEGADA_TARDE",
      title: "Última tolerancia semanal usada",
      body: "Usaste tu última tolerancia semanal disponible; el próximo ingreso fuera de hora será tardanza.",
      url: "/app",
      tag: `tolerance-warn-${params.user.id}`,
      data: { category: "TOLERANCE_WARNING" },
    });
  }
}

async function handleSplitShiftEntry1(ctx: ShiftExecutionContext): Promise<ShiftExecutionResult> {
  let isLate = false;
  let diffLate = 0;
  let usedTol = false;
  let excTol = false;
  let isLastTol = false;

  if (ctx.schedule) {
    const scheduledMinutes = ctx.schedule.entryHour * 60 + ctx.schedule.entryMinute;
    const tolerance = resolveToleranceMinutes(ctx.schedule.toleranceMinutes, ctx.kiosk.location.organization?.settings);
    const delayMinutes = computeEntryDelayMinutes(
      ctx.now,
      ctx.shiftDateStr,
      ctx.schedule.entryHour,
      ctx.schedule.entryMinute,
      ctx.timezone
    );
    const checkResult = await checkToleranceWeeklyLimit(
      ctx.user.id,
      ctx.kiosk.location.organization?.settings,
      ctx.today,
      scheduledMinutes + delayMinutes,
      scheduledMinutes,
      tolerance
    );
    isLate = checkResult.isLate;
    diffLate = checkResult.diffLate;
    usedTol = checkResult.usedTolerance;
    excTol = checkResult.exceededTolerance;
    isLastTol = checkResult.isLastTolerance;
  }

  const status = isLate ? AttendanceStatus.TARDE : AttendanceStatus.PRESENTE;
  let message = isLate
    ? `¡Hola, ${ctx.user.firstName}! Entrada Tramo 1 registrada con tardanza (+${diffLate} min).`
    : `¡Bienvenido(a), ${ctx.user.firstName}! Entrada Tramo 1 registrada puntualmente.`;

  if (excTol) {
    message += " (Has excedido tu límite de tolerancias semanales)";
  }
  await notifyToleranceAlert({
    organizationId: ctx.kiosk.location.organizationId,
    user: ctx.user,
    exceededTolerance: excTol,
    isLastTolerance: isLastTol,
  });
  if (ctx.isDniScan) {
    message += " (Pendiente de confirmación)";
  }

  const lateMinutes = diffLate > 0 ? diffLate : null;
  const attendance = await prisma.attendance.upsert({
    where: { userId_date: { userId: ctx.user.id, date: ctx.today } },
    update: {
      entryTime: ctx.now,
      status,
      lateMinutes,
      usedTolerance: usedTol,
      exceededTolerance: excTol,
      locationId: ctx.kiosk.locationId,
      kioskId: ctx.kiosk.id,
      notes: ctx.initialDniNotes,
      statusChangedBy: ctx.changedBy,
      statusChangedAt: ctx.now,
    },
    create: {
      userId: ctx.user.id,
      locationId: ctx.kiosk.locationId,
      kioskId: ctx.kiosk.id,
      date: ctx.today,
      entryTime: ctx.now,
      status,
      lateMinutes,
      usedTolerance: usedTol,
      exceededTolerance: excTol,
      notes: ctx.initialDniNotes,
      statusChangedBy: ctx.changedBy,
      statusChangedAt: ctx.now,
    },
  });

  return { attendance, scanType: "ENTRY", status, message };
}

async function handleSplitShiftExit1(
  attendance: AttendanceRecord,
  ctx: ShiftExecutionContext
): Promise<ShiftExecutionResult> {
  const shift1Worked = Math.max(0, differenceInMinutes(ctx.now, new Date(attendance.entryTime ?? ctx.now)));
  const workedStr = formatWorkedDuration(shift1Worked);
  const dniSuffix = ctx.isDniScan ? " (Pendiente de confirmación)" : "";
  const message = `¡Buen provecho, ${ctx.user.firstName}! Salida a receso registrada (Tramo 1: ${workedStr}).${dniSuffix}`;

  const dniNote = `[PENDIENTE_VALIDACION_DNI] Salida Tramo 1 por DNI a las ${formatLocalTime(ctx.now, "HH:mm:ss", ctx.timezone)}.`;
  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      exitTime: ctx.now,
      workedMinutes: shift1Worked,
      notes: appendDniNote(attendance.notes, dniNote, ctx.isDniScan),
      statusChangedBy: ctx.changedBy,
      statusChangedAt: ctx.now,
    },
  });

  return { attendance: updated, scanType: "EXIT", status: updated.status, message };
}

async function evaluateSecondShiftTolerance(ctx: ShiftExecutionContext) {
  if (ctx.schedule?.entryHour2 === null || ctx.schedule?.entryHour2 === undefined) {
    return { diffLate2: 0, usedTol2: false, excTol2: false };
  }
  const scheduledMinutes2 = ctx.schedule.entryHour2 * 60 + (ctx.schedule.entryMinute2 || 0);
  const tolerance2 = resolveToleranceMinutes(
    ctx.schedule.toleranceMinutes2 ?? ctx.schedule.toleranceMinutes,
    ctx.kiosk.location.organization?.settings
  );
  const checkResult = await checkToleranceWeeklyLimit(
    ctx.user.id,
    ctx.kiosk.location.organization?.settings,
    ctx.today,
    ctx.actualTotalMinutes,
    scheduledMinutes2,
    tolerance2
  );
  return {
    diffLate2: checkResult.diffLate,
    usedTol2: checkResult.usedTolerance,
    excTol2: checkResult.exceededTolerance,
  };
}

async function handleSplitShiftEntry2(
  attendance: AttendanceRecord,
  ctx: ShiftExecutionContext
): Promise<ShiftExecutionResult> {
  const exit1Time = new Date(attendance.exitTime ?? ctx.now);
  const diffSinceExit1 = differenceInMinutes(ctx.now, exit1Time);
  if (diffSinceExit1 < 2 && ctx.mode !== "ENTRY") {
    const message = `Tu salida a receso fue registrada a las ${formatLocalTime(
      exit1Time,
      "HH:mm",
      ctx.timezone
    )}. ¡Disfruta tu refrigerio!`;
    return { attendance, scanType: "ALREADY_REGISTERED", status: attendance.status, message };
  }

  const { diffLate2, usedTol2, excTol2 } = await evaluateSecondShiftTolerance(ctx);

  const nextStatus = diffLate2 > 0 ? AttendanceStatus.TARDE : attendance.status;
  const totalLate = (attendance.lateMinutes || 0) + diffLate2;
  let message =
    diffLate2 > 0
      ? `¡Bienvenido de vuelta, ${ctx.user.firstName}! Entrada Tramo 2 registrada con tardanza (+${diffLate2} min).`
      : `¡Bienvenido de vuelta, ${ctx.user.firstName}! Entrada Tramo 2 registrada a tiempo.`;

  if (excTol2) {
    message += " (Límite de tolerancias semanales excedido)";
    await sendPushToSupervisors(ctx.kiosk.location.organizationId, {
      title: "Límite de Tolerancia",
      body: `${ctx.user.firstName} ${ctx.user.lastName} ha excedido las tolerancias semanales permitidas.`,
    });
  }
  if (ctx.isDniScan) {
    message += " (Pendiente de confirmación)";
  }

  const dniNote = `[PENDIENTE_VALIDACION_DNI] Entrada Tramo 2 por DNI a las ${formatLocalTime(ctx.now, "HH:mm:ss", ctx.timezone)}.`;
  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      entryTime2: ctx.now,
      status: nextStatus,
      lateMinutes: totalLate > 0 ? totalLate : null,
      lateMinutes2: diffLate2 > 0 ? diffLate2 : null,
      usedTolerance: attendance.usedTolerance || usedTol2,
      exceededTolerance: attendance.exceededTolerance || excTol2,
      notes: appendDniNote(attendance.notes, dniNote, ctx.isDniScan),
      statusChangedBy: ctx.changedBy,
      statusChangedAt: ctx.now,
    },
  });

  return { attendance: updated, scanType: "ENTRY", status: updated.status, message };
}

async function handleSplitShiftExit2(
  attendance: AttendanceRecord,
  ctx: ShiftExecutionContext
): Promise<ShiftExecutionResult> {
  const shift1Worked = Math.max(
    0,
    differenceInMinutes(new Date(attendance.exitTime ?? ctx.now), new Date(attendance.entryTime ?? ctx.now))
  );
  const shift2Worked = Math.max(0, differenceInMinutes(ctx.now, new Date(attendance.entryTime2 ?? ctx.now)));
  const workedMinutes = shift1Worked + shift2Worked;

  if (!attendance.exitTime2) {
    const workedStr = formatWorkedDuration(workedMinutes);
    const dniSuffix = ctx.isDniScan ? " (Pendiente de confirmación)" : "";
    const message = `¡Hasta luego, ${ctx.user.firstName}! Jornada completada con éxito. Total trabajado: ${workedStr}.${dniSuffix}`;
    const dniNote = `[PENDIENTE_VALIDACION_DNI] Salida final por DNI a las ${formatLocalTime(ctx.now, "HH:mm:ss", ctx.timezone)}.`;
    const overtime = computeOvertime(ctx.now, ctx.schedule, ctx.timezone, 15, attendance.entryTime);

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        exitTime2: ctx.now,
        workedMinutes,
        overtimeMinutes: overtime.overtimeMinutes,
        overtimeStatus: overtime.overtimeStatus,
        notes: appendDniNote(attendance.notes, dniNote, ctx.isDniScan),
        statusChangedBy: ctx.changedBy,
        statusChangedAt: ctx.now,
      },
    });
    return { attendance: updated, scanType: "EXIT", status: updated.status, message };
  }

  const diffSinceExit2 = differenceInMinutes(ctx.now, new Date(attendance.exitTime2));
  if (diffSinceExit2 < 2 && ctx.mode !== "EXIT") {
    const message = `Tu salida final ya fue registrada a las ${formatLocalTime(
      new Date(attendance.exitTime2),
      "HH:mm",
      ctx.timezone
    )}. ¡Que tengas buen descanso!`;
    return { attendance, scanType: "ALREADY_REGISTERED", status: attendance.status, message };
  }

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      exitTime2: ctx.now,
      workedMinutes,
      statusChangedBy: ctx.changedBy,
      statusChangedAt: ctx.now,
    },
  });
  const message = `Salida final actualizada a las ${formatLocalTime(ctx.now, "HH:mm", ctx.timezone)}. ¡Buen descanso!`;
  return { attendance: updated, scanType: "EXIT", status: updated.status, message };
}

async function processSplitShift(
  attendance: AttendanceRecord | null,
  ctx: ShiftExecutionContext
): Promise<ShiftExecutionResult> {
  if (!attendance?.entryTime) return handleSplitShiftEntry1(ctx);
  if (!attendance.exitTime) return handleSplitShiftExit1(attendance, ctx);
  if (!attendance.entryTime2) return handleSplitShiftEntry2(attendance, ctx);
  return handleSplitShiftExit2(attendance, ctx);
}

function buildContinuousEntryMessage(
  firstName: string,
  isDniScan: boolean,
  hasSchedule: boolean,
  isLate: boolean,
  lateMinutes: number,
  localTimeFormatted: string
): string {
  if (isLate) {
    return isDniScan
      ? `¡Hola, ${firstName}! Entrada por DNI registrada (${localTimeFormatted}, +${lateMinutes} min tarde). Pendiente de confirmación del supervisor.`
      : `¡Hola, ${firstName}! Entrada registrada con tardanza (+${lateMinutes} min).`;
  }
  if (isDniScan) {
    return `¡Hola, ${firstName}! Entrada por DNI registrada a las ${localTimeFormatted}. Pendiente de confirmación del supervisor.`;
  }
  return hasSchedule
    ? `¡Bienvenido(a), ${firstName}! Entrada registrada puntualmente.`
    : `¡Bienvenido(a), ${firstName}! Entrada registrada con éxito.`;
}

async function handleContinuousEntry(ctx: ShiftExecutionContext): Promise<ShiftExecutionResult> {
  let isLate = false;
  let lateMinutes = 0;
  let usedTol = false;
  let excTol = false;
  let isLastTol = false;

  if (ctx.schedule) {
    const scheduledTotalMinutes = ctx.schedule.entryHour * 60 + ctx.schedule.entryMinute;
    const tolerance = resolveToleranceMinutes(ctx.schedule.toleranceMinutes, ctx.kiosk.location.organization?.settings);
    const delayMinutes = computeEntryDelayMinutes(
      ctx.now,
      ctx.shiftDateStr,
      ctx.schedule.entryHour,
      ctx.schedule.entryMinute,
      ctx.timezone
    );
    const checkResult = await checkToleranceWeeklyLimit(
      ctx.user.id,
      ctx.kiosk.location.organization?.settings,
      ctx.today,
      scheduledTotalMinutes + delayMinutes,
      scheduledTotalMinutes,
      tolerance
    );
    isLate = checkResult.isLate;
    lateMinutes = isLate ? checkResult.diffLate : 0;
    usedTol = checkResult.usedTolerance;
    excTol = checkResult.exceededTolerance;
    isLastTol = checkResult.isLastTolerance;
  }

  const status = isLate ? AttendanceStatus.TARDE : AttendanceStatus.PRESENTE;
  let message = buildContinuousEntryMessage(
    ctx.user.firstName,
    ctx.isDniScan,
    Boolean(ctx.schedule),
    isLate,
    lateMinutes,
    ctx.localTimeFormatted
  );

  if (isLate && excTol) {
    message += " (Límite de tolerancias semanales excedido)";
  }
  await notifyToleranceAlert({
    organizationId: ctx.kiosk.location.organizationId,
    user: ctx.user,
    exceededTolerance: isLate && excTol,
    isLastTolerance: isLastTol,
  });

  const lateValue = lateMinutes > 0 ? lateMinutes : null;
  const attendance = await prisma.attendance.upsert({
    where: { userId_date: { userId: ctx.user.id, date: ctx.today } },
    update: {
      entryTime: ctx.now,
      status,
      lateMinutes: lateValue,
      usedTolerance: usedTol,
      exceededTolerance: excTol,
      locationId: ctx.kiosk.locationId,
      kioskId: ctx.kiosk.id,
      notes: ctx.initialDniNotes,
      statusChangedBy: ctx.changedBy,
      statusChangedAt: ctx.now,
    },
    create: {
      userId: ctx.user.id,
      locationId: ctx.kiosk.locationId,
      kioskId: ctx.kiosk.id,
      date: ctx.today,
      entryTime: ctx.now,
      status,
      lateMinutes: lateValue,
      usedTolerance: usedTol,
      exceededTolerance: excTol,
      notes: ctx.initialDniNotes,
      statusChangedBy: ctx.changedBy,
      statusChangedAt: ctx.now,
    },
  });

  return { attendance, scanType: "ENTRY", status, message };
}

async function processContinuousShift(
  attendance: AttendanceRecord | null,
  ctx: ShiftExecutionContext
): Promise<ShiftExecutionResult> {
  if (!attendance?.entryTime) {
    return handleContinuousEntry(ctx);
  }

  const isExplicitExit = ctx.mode === "EXIT";
  const entryDate = new Date(attendance.entryTime);
  const workedMinutes = Math.max(0, differenceInMinutes(ctx.now, entryDate));

  if (!attendance.exitTime || isExplicitExit) {
    const finalStatus =
      attendance.status === AttendanceStatus.TARDE ? AttendanceStatus.TARDE : AttendanceStatus.PRESENTE;
    const dniNote = `[PENDIENTE_VALIDACION_DNI] Salida manual por DNI a las ${formatLocalTime(ctx.now, "HH:mm:ss", ctx.timezone)}.`;
    const overtime = computeOvertime(ctx.now, ctx.schedule, ctx.timezone, 15, entryDate);

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        exitTime: ctx.now,
        workedMinutes,
        overtimeMinutes: overtime.overtimeMinutes,
        overtimeStatus: overtime.overtimeStatus,
        status: finalStatus,
        notes: appendDniNote(attendance.notes, dniNote, ctx.isDniScan),
        statusChangedBy: ctx.changedBy,
        statusChangedAt: ctx.now,
      },
    });

    const workedStr = formatWorkedDuration(workedMinutes);
    const message = ctx.isDniScan
      ? `¡Hasta luego, ${ctx.user.firstName}! Salida por DNI registrada (${workedStr} trabajados). Pendiente de confirmación del supervisor.`
      : `¡Hasta luego, ${ctx.user.firstName}! Salida registrada. Tiempo trabajado: ${workedStr}.`;

    return { attendance: updated, scanType: "EXIT", status: finalStatus, message };
  }

  const diffSinceExit = differenceInMinutes(ctx.now, new Date(attendance.exitTime));
  if (diffSinceExit < 2) {
    const message = `Tu salida ya fue registrada a las ${formatLocalTime(
      new Date(attendance.exitTime),
      "HH:mm",
      ctx.timezone
    )}. ¡Que tengas buen descanso!`;
    return { attendance, scanType: "ALREADY_REGISTERED", status: attendance.status, message };
  }

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      exitTime: ctx.now,
      workedMinutes,
      statusChangedBy: ctx.changedBy,
      statusChangedAt: ctx.now,
    },
  });

  const message = `Salida actualizada a las ${formatLocalTime(ctx.now, "HH:mm", ctx.timezone)}. ¡Buen descanso!`;
  return { attendance: updated, scanType: "EXIT", status: updated.status, message };
}

async function notifySupervisorsForDniScan(params: {
  organizationId: string;
  locationId: string;
  locationName: string;
  kioskName: string;
  user: { id: string; firstName: string; lastName: string; photoUrl: string | null; documentId: string | null };
  searchQrToken: string;
  attendanceId: string;
  scanType: ScanType;
  status: AttendanceStatus;
  now: Date;
  timezone: string;
}) {
  try {
    const supervisors = await prisma.user.findMany({
      where: {
        organizationId: params.organizationId,
        isActive: true,
        role: { in: ["ADMIN", "SUPERVISOR", "SUPER_ADMIN"] },
        OR: [{ locationId: null }, { locationId: params.locationId }],
      },
      select: { id: true },
    });

    if (supervisors.length === 0) return;

    const fullName = `${params.user.firstName} ${params.user.lastName}`;
    const docId = params.user.documentId || params.searchQrToken;
    const actionLabel = params.scanType === "ENTRY" ? "ENTRADA" : "SALIDA";
    const notifTitle = `⚠️ Solicitud de Marcación por DNI — ${fullName}`;
    const notifBody = `${fullName} (DNI: ${docId}) marcó ${actionLabel} manualmente en ${params.kioskName} a las ${formatLocalTime(params.now, "HH:mm", params.timezone)}. Requiere confirmación de identidad.`;

    const notificationData = {
      isDniApproval: true,
      attendanceId: params.attendanceId,
      userId: params.user.id,
      userName: fullName,
      userPhoto: params.user.photoUrl,
      documentId: docId,
      scanType: params.scanType,
      time: formatLocalTime(params.now, "HH:mm:ss", params.timezone),
      locationId: params.locationId,
      locationName: params.locationName,
      kioskName: params.kioskName,
      proposedStatus: params.status,
    };

    await prisma.notification.createMany({
      data: supervisors.map((sup) => ({
        userId: sup.id,
        type: "LLEGADA_TARDE",
        title: notifTitle,
        body: notifBody,
        data: notificationData,
      })),
    });

    await sendPushToSupervisors(params.organizationId, {
      title: notifTitle,
      body: notifBody,
      url: "/asistencias",
      tag: `dni-verify-${params.attendanceId}`,
      data: notificationData,
    });
  } catch (notifErr) {
    console.error("Error al despachar notificación de verificación DNI:", notifErr);
  }
}

async function updateKioskHeartbeatIfNeeded(
  kiosk: { id: string; lastSeenAt: Date | null; ipAddress: string | null },
  ipAddress: string
) {
  const reqTime = new Date();
  const isStale = !kiosk.lastSeenAt || reqTime.getTime() - kiosk.lastSeenAt.getTime() > 60000;
  if (isStale || kiosk.ipAddress !== ipAddress) {
    await prisma.kiosk.update({
      where: { id: kiosk.id },
      data: { lastSeenAt: reqTime, ipAddress },
    });
  }
}

function isQrTokenExpiredByDays(
  isQrOrSigned: boolean,
  qrGeneratedAt: Date | null
): boolean {
  if (!isQrOrSigned || !qrGeneratedAt) return false;
  const daysSinceGenerated = (Date.now() - new Date(qrGeneratedAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceGenerated > 60;
}

async function executeShiftAttendance(params: {
  user: ShiftExecutionContext["user"];
  kiosk: ShiftExecutionContext["kiosk"];
  schedule: ShiftExecutionContext["schedule"];
  today: Date;
  shiftDateStr: string;
  existingAttendance?: AttendanceRecord | null;
  now: Date;
  timezone: string;
  isDniScan: boolean;
  searchQrToken: string;
  mode: "AUTO" | "ENTRY" | "EXIT";
}): Promise<ShiftExecutionResult | null> {
  const { user, kiosk, schedule, today, shiftDateStr, existingAttendance, now, timezone, isDniScan, searchQrToken, mode } = params;
  const attendance =
    existingAttendance !== undefined
      ? existingAttendance
      : await prisma.attendance.findUnique({
          where: { userId_date: { userId: user.id, date: today } },
        });

  if (mode !== "ENTRY") {
    const recentExitInfo = await findRecentAccidentalExit(user.id, now, timezone);
    if (recentExitInfo) {
      return {
        attendance: recentExitInfo.attendance,
        scanType: "ALREADY_REGISTERED",
        status: recentExitInfo.attendance.status,
        message: recentExitInfo.message,
      };
    }
  }

  const { hour: localHour, minute: localMinute } = getLocalTimeParts(now, timezone);
  const initialDniNotes = isDniScan
    ? `[PENDIENTE_VALIDACION_DNI] Marcación manual por DNI (${user.documentId || searchQrToken}) en ${kiosk.name} a las ${formatLocalTime(now, "HH:mm:ss", timezone)}.`
    : null;

  const shiftCtx: ShiftExecutionContext = {
    user,
    kiosk,
    schedule,
    today,
    shiftDateStr,
    now,
    timezone,
    localTimeFormatted: formatLocalTime(now, "HH:mm", timezone),
    actualTotalMinutes: localHour * 60 + localMinute,
    isDniScan,
    initialDniNotes,
    mode,
    changedBy: isDniScan ? `KIOSK_DNI_${kiosk.name}` : `KIOSK_${kiosk.name}`,
  };

  return schedule?.isSplit
    ? processSplitShift(attendance, shiftCtx)
    : processContinuousShift(attendance, shiftCtx);
}

async function authenticateScanKiosk(req: Request) {
  const apiKey = req.headers.get("x-kiosk-api-key");
  if (!apiKey) {
    return {
      errorResponse: NextResponse.json(
        { error: "Falta la clave de autenticación del Kiosk (x-kiosk-api-key)" },
        { status: 401 }
      ),
    };
  }

  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  const rateResult = await checkRateLimit({
    key: `kiosk_scan:${apiKey}:${ipAddress}`,
    limit: 120,
    windowSeconds: 60,
  });

  if (!rateResult.success) {
    return {
      errorResponse: NextResponse.json(
        {
          error: "Frecuencia general de escaneos excedida en este Kiosk. Por favor espera unos segundos.",
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
      ),
    };
  }

  const kiosk = await prisma.kiosk.findUnique({
    where: { apiKey },
    include: { location: { include: { organization: true } } },
  });

  if (!kiosk?.isActive || !kiosk.location?.isActive) {
    return {
      errorResponse: NextResponse.json(
        { error: "Dispositivo Kiosk o sede no registrada, inactiva o clave incorrecta" },
        { status: 401 }
      ),
    };
  }

  await updateKioskHeartbeatIfNeeded(kiosk, ipAddress);
  return { kiosk };
}

async function parseAndVerifyScanRequest(req: Request, organizationId: string) {
  const parsed = ScanSchema.safeParse(await req.json());
  if (!parsed.success) {
    return {
      errorResponse: NextResponse.json(
        { error: "Datos de escaneo inválidos", details: parsed.error.format() },
        { status: 400 }
      ),
    };
  }

  const { qrToken: rawToken, mode, verificationPhotoUrl } = parsed.data;
  const trimmedRawToken = rawToken.trim();
  let searchQrToken = trimmedRawToken;
  let verifiedUserId: string | undefined;

  if (isSignedQrPayload(searchQrToken)) {
    const verification = verifySignedQrPayload(searchQrToken);
    if (!verification.isValid) {
      return {
        errorResponse: NextResponse.json(
          { error: verification.error || "Firma criptográfica del código QR inválida o alterada" },
          { status: 403 }
        ),
      };
    }
    searchQrToken = verification.qrToken;
    verifiedUserId = verification.userId;
  }

  const debounceResult = await checkRateLimit({
    key: `scan_debounce:${organizationId}:${searchQrToken}`,
    limit: 1,
    windowSeconds: 5,
  });

  if (!debounceResult.success) {
    return {
      errorResponse: NextResponse.json(
        {
          error: "Marcación ya registrada hace un instante. Espera 5 segundos si necesitas volver a escanear.",
          retryAfter: debounceResult.resetSeconds,
        },
        { status: 429 }
      ),
    };
  }

  return { mode, trimmedRawToken, searchQrToken, verifiedUserId, verificationPhotoUrl };
}

// POST /api/attendance/scan
export async function POST(req: Request) {
  try {
    const authResult = await authenticateScanKiosk(req);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const { kiosk } = authResult;

    const reqData = await parseAndVerifyScanRequest(req, kiosk.location.organizationId);
    if (reqData.errorResponse) {
      return reqData.errorResponse;
    }
    const { mode, trimmedRawToken, searchQrToken, verifiedUserId, verificationPhotoUrl } = reqData;

    const isUuid = UUID_REGEX.test(searchQrToken);
    const cleanToken = searchQrToken.replace(/[:-\s]/g, "");
    const userWhere = buildScanUserWhere(
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
          where: { OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }] },
          include: { schedule: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Credencial no reconocida (QR/NFC/DNI inválido o usuario inactivo)" },
        { status: 404 }
      );
    }

    const { isSigned, isQrTokenMatch, isNfcScan, isDniScan } = classifyScanCredentials(
      user,
      trimmedRawToken,
      searchQrToken,
      cleanToken,
      isUuid
    );

    if (isQrTokenExpiredByDays(isQrTokenMatch || isSigned, user.qrGeneratedAt)) {
      return NextResponse.json(
        {
          error: "Tu credencial QR ha caducado por seguridad (> 60 días). Solicita su renovación a tu administrador.",
        },
        { status: 403 }
      );
    }

    const orgSettings = resolveOrgSettings(kiosk.location.organization?.settings);
    const timezone = kiosk.location.timezone || orgSettings.timezone || DEFAULT_TIMEZONE;
    const now = new Date();
    const today = getLocalTodayDate(now, timezone);
    const todayStr = today.toISOString().slice(0, 10);

    // 1. Verificar primero si el colaborador está cerrando un turno nocturno abierto de ayer (ej. entró Lunes 22:00, sale Martes 06:00 aunque Martes sea su día libre)
    let targetShiftDate = today;
    let targetShiftDateStr = todayStr;
    let preloadedAttendance = await prisma.attendance.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    });

    const isClosingOpenOvernight =
      mode !== "ENTRY" && !preloadedAttendance?.entryTime
        ? await findOpenOvernightShift(user.id, now)
        : null;

    let schedule: ShiftExecutionContext["schedule"] = null;

    if (isClosingOpenOvernight) {
      preloadedAttendance = isClosingOpenOvernight;
      targetShiftDate = isClosingOpenOvernight.date;
      targetShiftDateStr = isClosingOpenOvernight.date.toISOString().slice(0, 10);
      const resolvedPrev = await fetchEffectiveScheduleForUserDate(
        user.id,
        targetShiftDate,
        targetShiftDateStr
      );
      schedule = resolvedPrev.schedule || user.userSchedules?.[0]?.schedule;
    } else {
      // 2. Verificar si es una entrada tardía post-medianoche de un turno nocturno de ayer (ej. turno Lunes 23:45, llega Martes 00:10)
      let matchedLateOvernight = false;
      if (mode !== "EXIT" && !preloadedAttendance?.entryTime) {
        const yesterdayDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
        const resolvedYesterday = await fetchEffectiveScheduleForUserDate(
          user.id,
          yesterdayDate,
          yesterdayStr
        );
        const ySched = resolvedYesterday.schedule;
        if (ySched && !resolvedYesterday.isDayOff && isOvernightSchedule(ySched)) {
          const delayFromYesterday = computeEntryDelayMinutes(
            now,
            yesterdayStr,
            ySched.entryHour,
            ySched.entryMinute,
            timezone
          );
          if (delayFromYesterday >= 0 && delayFromYesterday <= 240) {
            const yesterdayAtt = await prisma.attendance.findUnique({
              where: { userId_date: { userId: user.id, date: yesterdayDate } },
            });
            if (!yesterdayAtt?.entryTime && (!yesterdayAtt || yesterdayAtt.status === "PENDIENTE")) {
              matchedLateOvernight = true;
              targetShiftDate = yesterdayDate;
              targetShiftDateStr = yesterdayStr;
              preloadedAttendance = yesterdayAtt;
              schedule = ySched;
            }
          }
        }
      }

      if (!matchedLateOvernight) {
        const resolvedToday = await fetchEffectiveScheduleForUserDate(user.id, today, todayStr);
        if (resolvedToday.isDayOff && resolvedToday.isOverride) {
          return NextResponse.json(
            { error: "Hoy es tu día libre programado. No requieres registrar asistencia." },
            { status: 400 }
          );
        }
        schedule = resolvedToday.schedule || user.userSchedules?.[0]?.schedule;
      }
    }

    const isSplit = Boolean(schedule?.isSplit);
    const shiftResult = await executeShiftAttendance({
      user,
      kiosk,
      schedule,
      today: targetShiftDate,
      shiftDateStr: targetShiftDateStr,
      existingAttendance: preloadedAttendance,
      now,
      timezone,
      isDniScan,
      searchQrToken,
      mode,
    });

    if (!shiftResult) {
      return NextResponse.json({ error: "No se pudo determinar el registro de asistencia" }, { status: 500 });
    }

    const { attendance, scanType, status, message } = shiftResult;

    if (isDniScan && verificationPhotoUrl && scanType !== "ALREADY_REGISTERED") {
      const storedPhotoUrl = await offloadDataUrlIfConfigured(
        verificationPhotoUrl,
        kiosk.location.organizationId,
        "kiosk-photos"
      );
      await prisma.attendance.update({
        where: { id: attendance.id },
        data: { verificationPhotoUrl: storedPhotoUrl },
      });
    }

    if (isDniScan && scanType !== "ALREADY_REGISTERED") {
      await notifySupervisorsForDniScan({
        organizationId: kiosk.location.organizationId,
        locationId: kiosk.locationId,
        locationName: kiosk.location.name,
        kioskName: kiosk.name,
        user,
        searchQrToken,
        attendanceId: attendance.id,
        scanType,
        status,
        now,
        timezone,
      });
    }

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
        entryTime2: attendance.entryTime2,
        exitTime2: attendance.exitTime2,
        lateMinutes: attendance.lateMinutes,
        lateMinutes2: attendance.lateMinutes2,
        isSigned,
        isNfcScan,
        isDniScan,
        requiresVerification: isDniScan,
      },
      req,
    });

    const microInteraction = await generateMicroInteraction({
      user,
      attendance,
      scanType,
      status: attendance.status,
      lateMinutes: attendance.lateMinutes,
      organizationName: kiosk.location.organization?.name || "Presenxa",
      timezone,
      now,
      isSplit,
    });

    return NextResponse.json({
      success: true,
      scanType,
      message,
      method: resolveScanMethodLabel(isNfcScan, isSigned, isDniScan),
      requiresVerification: isDniScan,
      time: formatLocalTime(now, "HH:mm:ss", timezone),
      date: getLocalDateString(now, timezone),
      status: attendance.status,
      lateMinutes: attendance.lateMinutes,
      lateMinutes2: attendance.lateMinutes2,
      workedMinutes: attendance.workedMinutes,
      entryTime: attendance.entryTime,
      exitTime: attendance.exitTime,
      entryTime2: attendance.entryTime2,
      exitTime2: attendance.exitTime2,
      microInteraction,
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
  } catch (error: unknown) {
    console.error("Error en escaneo de asistencia:", error);
    return NextResponse.json({ error: "Error interno al procesar escaneo" }, { status: 500 });
  }
}
