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
    // 1. Obtener usuarios activos con sede asignada y sus horarios vigentes
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ["EMPLEADO", "ALUMNO"] },
        locationId: { not: null },
      },
      select: {
        id: true,
        locationId: true,
        userSchedules: {
          where: {
            OR: [
              { validUntil: null },
              { validUntil: { gt: new Date() } },
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

    let createdCount = 0;
    const startOfToday = new Date(`${dateStr}T00:00:00.000Z`);

    // 3. Crear registros PENDIENTE en lotes si no existen
    for (const u of eligibleUsers) {
      if (!u.locationId) continue;

      try {
        const existing = await prisma.attendance.findUnique({
          where: {
            userId_date: {
              userId: u.id,
              date: startOfToday,
            },
          },
        });

        if (!existing) {
          await prisma.attendance.create({
            data: {
              userId: u.id,
              locationId: u.locationId,
              date: startOfToday,
              status: "PENDIENTE",
              statusChangedBy: "CRON_SOD",
              statusChangedAt: new Date(),
            },
          });
          createdCount++;
        }
      } catch (err) {
        // Ignorar conflictos concurrentes
      }
    }

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
