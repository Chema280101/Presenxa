import { prisma } from "@asistencias/db";
import { buildZonedDateTime, DEFAULT_TIMEZONE, getLocalDateString } from "@/lib/dateUtils";

export interface ScheduleLike {
  id?: string;
  name?: string;
  workdaysMask?: number;
  entryHour: number;
  entryMinute: number;
  exitHour: number;
  exitMinute: number;
  toleranceMinutes?: number | null;
  isSplit?: boolean;
  crossesMidnight?: boolean;
  entryHour2?: number | null;
  entryMinute2?: number | null;
  exitHour2?: number | null;
  exitMinute2?: number | null;
  toleranceMinutes2?: number | null;
}

/**
 * Determina dinámicamente si un turno configurado por la empresa cruza la medianoche.
 * Ejemplo: 22:00 -> 06:00, 23:30 -> 07:30, 19:00 -> 03:00.
 */
export function isOvernightSchedule(schedule: ScheduleLike | null | undefined): boolean {
  if (!schedule) return false;
  if (schedule.crossesMidnight) return true;
  const entry1 = schedule.entryHour * 60 + schedule.entryMinute;
  const exit1 = schedule.exitHour * 60 + schedule.exitMinute;
  if (exit1 <= entry1) return true;
  if (schedule.isSplit && schedule.exitHour2 !== null && schedule.exitHour2 !== undefined) {
    const exit2 = schedule.exitHour2 * 60 + (schedule.exitMinute2 ?? 0);
    if (exit2 <= entry1) return true;
  }
  return false;
}

/**
 * Convierte una fecha 'YYYY-MM-DD' al bitmask de días del sistema:
 * Lun=1, Mar=2, Mié=4, Jue=8, Vie=16, Sáb=32, Dom=64.
 */
export function getSystemDayBit(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0=Dom, 1=Lun...6=Sáb
  const systemDayIndex = utcDay === 0 ? 6 : utcDay - 1;
  return 1 << systemDayIndex;
}

/**
 * Resuelve el horario efectivo de un colaborador para una fecha específica,
 * priorizando la rotación/excepción específica del día (ShiftOverride) sobre el horario base (UserSchedule).
 */
export function resolveEffectiveSchedule<T extends ScheduleLike>(params: {
  dateStr: string;
  shiftOverride?: { isDayOff: boolean; schedule: T | null } | null;
  userSchedules?: Array<{ schedule: T }>;
}): { schedule: T | null; isDayOff: boolean; isOverride: boolean } {
  const { dateStr, shiftOverride, userSchedules } = params;

  if (shiftOverride) {
    if (shiftOverride.isDayOff) {
      return { schedule: null, isDayOff: true, isOverride: true };
    }
    if (shiftOverride.schedule) {
      return { schedule: shiftOverride.schedule, isDayOff: false, isOverride: true };
    }
  }

  const baseSchedule = userSchedules?.[0]?.schedule ?? null;
  if (!baseSchedule) {
    return { schedule: null, isDayOff: false, isOverride: false };
  }

  const dayBit = getSystemDayBit(dateStr);
  const mask = baseSchedule.workdaysMask ?? 127;
  if ((mask & dayBit) === 0) {
    return { schedule: null, isDayOff: true, isOverride: false };
  }

  return { schedule: baseSchedule, isDayOff: false, isOverride: false };
}

/**
 * Consulta y resuelve el horario efectivo de un usuario para una fecha en BD.
 */
export async function fetchEffectiveScheduleForUserDate(
  userId: string,
  targetDateDb: Date,
  dateStr: string
) {
  const [shiftOverride, userSchedules] = await Promise.all([
    prisma.shiftOverride.findUnique({
      where: { userId_date: { userId, date: targetDateDb } },
      include: { schedule: true },
    }),
    prisma.userSchedule.findMany({
      where: {
        userId,
        validFrom: { lte: targetDateDb },
        OR: [{ validUntil: null }, { validUntil: { gt: targetDateDb } }],
      },
      include: { schedule: true },
      orderBy: { validFrom: "desc" },
      take: 1,
    }),
  ]);

  return resolveEffectiveSchedule({ dateStr, shiftOverride, userSchedules });
}

/**
 * Calcula la diferencia de tardanza (en minutos) comparando el timestamp real de entrada
 * contra la hora programada del turno en la fecha del turno (soporta entradas que cruzan medianoche,
 * ej. turno 23:45 del lunes -> llega 00:05 del martes = +20 min).
 */
export function computeEntryDelayMinutes(
  entryDate: Date,
  shiftDateStr: string,
  entryHour: number,
  entryMinute: number,
  timeZone: string = DEFAULT_TIMEZONE
): number {
  const scheduledEntry = buildZonedDateTime(shiftDateStr, entryHour, entryMinute, timeZone, 0);
  return Math.round((entryDate.getTime() - scheduledEntry.getTime()) / 60000);
}

/**
 * Parsea una hora 'HH:mm' (o ISO) para edición manual de asistencias,
 * sumando automáticamente +1 día cuando la hora de salida es menor o igual a la hora de entrada
 * (turnos nocturnos como 22:00 -> 06:00).
 */
export function parseShiftTimeWithOvernight(
  timeVal: string | null | undefined,
  baseDate: Date,
  referenceStartDate?: Date | null,
  timeZone: string = DEFAULT_TIMEZONE
): Date | null {
  if (!timeVal) return null;
  if (timeVal.includes("T") || (timeVal.includes("-") && timeVal.length > 8)) {
    const d = new Date(timeVal);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const [hStr, mStr] = timeVal.split(":");
  const h = Number.parseInt(hStr, 10);
  const m = Number.parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  const baseDateStr = baseDate.toISOString().slice(0, 10);
  let parsed = buildZonedDateTime(baseDateStr, h, m, timeZone, 0);

  if (referenceStartDate && parsed.getTime() <= referenceStartDate.getTime()) {
    parsed = buildZonedDateTime(baseDateStr, h, m, timeZone, 1);
  }

  return parsed;
}
