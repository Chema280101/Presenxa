import { prisma } from "@asistencias/db";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dateUtils";

export interface JobResult {
  success: boolean;
  action: string;
  date: string;
  dayName?: string;
  totalEligible: number;
  created: number;
  message?: string;
  error?: string;
  timestamp: string;
}

/**
 * Apertura de Jornada (SOD - Start Of Day):
 * Genera registros de asistencia PENDIENTE para todos los usuarios activos
 * según su calendario laboral (workdaysMask).
 */
const TIME_OFF_STATUS_MAP: Record<string, string> = {
  VACACIONES: "VACACIONES",
  DESCANSO_MEDICO: "DESCANSO_MEDICO",
};

function resolveInitialAttendanceStatus(
  user: { id: string; organizationId: string; locationId: string | null },
  holidayOrgs: Set<string>,
  holidayLocs: Set<string>,
  timeOffByUser: Map<string, string>,
  dayOffUserIds: Set<string>
): any {
  const isHoliday =
    holidayOrgs.has(user.organizationId) ||
    Boolean(user.locationId && holidayLocs.has(user.locationId));
  if (isHoliday) return "FERIADO";
  if (dayOffUserIds.has(user.id)) return "DIA_LIBRE";

  const timeOffType = timeOffByUser.get(user.id);
  if (timeOffType) {
    return TIME_OFF_STATUS_MAP[timeOffType] ?? "PERMISO";
  }
  return "PENDIENTE";
}

async function createInitialAttendanceIfMissing(
  u: { id: string; organizationId: string; locationId: string | null },
  startOfToday: Date,
  holidayOrgs: Set<string>,
  holidayLocs: Set<string>,
  timeOffByUser: Map<string, string>,
  dayOffUserIds: Set<string>
): Promise<boolean> {
  if (!u.locationId) return false;
  try {
    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId: u.id, date: startOfToday } },
    });
    if (existing) return false;

    const initialStatus = resolveInitialAttendanceStatus(
      u,
      holidayOrgs,
      holidayLocs,
      timeOffByUser,
      dayOffUserIds
    );

    await prisma.attendance.create({
      data: {
        userId: u.id,
        locationId: u.locationId,
        date: startOfToday,
        status: initialStatus,
        statusChangedBy: "CRON_SOD",
        statusChangedAt: new Date(),
      },
    });
    return true;
  } catch {
    // Ignorar conflictos concurrentes
    return false;
  }
}

export async function runDailyStarter(targetDate?: Date): Promise<JobResult> {
  const dateObj = targetDate || new Date();
  const dateStr = getLocalDateString(dateObj, DEFAULT_TIMEZONE);

  // En JS: Sunday=0, Monday=1, ... Saturday=6
  // Convertimos a bitmask del sistema: Lun=1, Mar=2, Mié=4, Jue=8, Vie=16, Sáb=32, Dom=64
  const [year, month, day] = dateStr.split("-").map(Number);
  const localDate = new Date(year, month - 1, day);
  const jsDay = localDate.getDay();
  const systemDayIndex = jsDay === 0 ? 6 : jsDay - 1; // 0 para Lun, 6 para Dom
  const dayBit = 1 << systemDayIndex;

  const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const dayName = dayNames[systemDayIndex];

  console.log(`[SOD] Iniciando apertura de jornada para ${dateStr} (${dayName}, bitmask=${dayBit})`);

  try {
    const startOfToday = new Date(`${dateStr}T00:00:00.000Z`);

    // 0. Obtener feriados aplicables al día de hoy
    const holidays = await prisma.holiday.findMany({
      where: { date: startOfToday, isActive: true },
    });
    const holidayOrgs = new Set(holidays.filter(h => !h.locationId).map(h => h.organizationId));
    const holidayLocs = new Set(holidays.map(h => h.locationId).filter((id): id is string => Boolean(id)));

    // 1. Obtener usuarios activos con sede asignada y sus horarios vigentes
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: "EMPLEADO",
        locationId: { not: null },
      },
      select: {
        id: true,
        locationId: true,
        organizationId: true,
        userSchedules: {
          where: {
            validFrom: { lte: startOfToday },
            OR: [
              { validUntil: null },
              { validUntil: { gt: startOfToday } },
            ],
          },
          include: {
            schedule: true,
          },
          orderBy: { validFrom: "desc" },
          take: 1,
        },
      },
    });

    // 2. Filtrar usuarios cuyo horario incluya el día de hoy
    const eligibleUsers = users.filter((u) => {
      const activeSchedule = u.userSchedules[0]?.schedule;
      if (!activeSchedule) return true; // Si no tiene horario específico, se incluye por defecto
      return (activeSchedule.workdaysMask & dayBit) > 0;
    });

    const [approvedTimeOffs, dayOffOverrides] = await Promise.all([
      prisma.timeOffRequest.findMany({
        where: {
          status: "APPROVED",
          startDate: { lte: startOfToday },
          endDate: { gte: startOfToday },
        },
      }),
      prisma.shiftOverride.findMany({
        where: { date: startOfToday, isDayOff: true },
      }),
    ]);

    const timeOffByUser = new Map(approvedTimeOffs.map((t) => [t.userId, t.type]));
    const dayOffUserIds = new Set(dayOffOverrides.map((o) => o.userId));

    // 3. Crear registros PENDIENTE en lotes si no existen
    const createdFlags = await Promise.all(
      eligibleUsers.map((u) =>
        createInitialAttendanceIfMissing(
          u,
          startOfToday,
          holidayOrgs,
          holidayLocs,
          timeOffByUser,
          dayOffUserIds
        )
      )
    );
    const createdCount = createdFlags.filter(Boolean).length;

    console.log(`[SOD] Apertura completada: ${createdCount} registros PENDIENTE creados de ${eligibleUsers.length} elegibles.`);

    return {
      success: true,
      action: "daily-start",
      date: dateStr,
      dayName,
      totalEligible: eligibleUsers.length,
      created: createdCount,
      message: `Apertura completada: ${createdCount} registros creados de ${eligibleUsers.length} usuarios programados.`,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("[SOD] Error en apertura de jornada:", error);
    return {
      success: false,
      action: "daily-start",
      date: dateStr,
      totalEligible: 0,
      created: 0,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}
