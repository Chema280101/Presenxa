import { prisma, AttendanceStatus } from "@asistencias/db";
import { getLocalDateString, getLocalTimeParts, computeOvertime, DEFAULT_TIMEZONE } from "@/lib/dateUtils";
import { notifySupervisorsInOrg } from "@/lib/notifications";

export interface EodResult {
  success: boolean;
  action: string;
  date: string;
  ausentes: number;
  incompletos: number;
  completados: number;
  tardes_presentes?: number;
  minutosCalculados: number;
  minutos_calculados?: number;
  message?: string;
  error?: string;
  timestamp: string;
}

/**
 * Cierre de Jornada (EOD - End Of Day / Auditoría Hotelera):
 * Si no se provee targetDate, por defecto procesa el día de ayer (now - 24h)
 * para permitir que los recepcionistas del turno nocturno (ej: 22:00 a 06:00)
 * completen su marcación de salida antes del corte.
 * 
 * 1. PENDIENTE sin entrada -> AUSENTE
 * 2. Entrada sin salida -> INCOMPLETO
 * 3. Entrada + Salida -> Calcula lateMinutes, workedMinutes y clasifica TARDE o PRESENTE.
 */
async function applyHolidayStatuses(targetDateDb: Date): Promise<void> {
  const holidays = await prisma.holiday.findMany({
    where: { date: targetDateDb, isActive: true },
  });

  await Promise.all(
    holidays.map((holiday) =>
      prisma.attendance.updateMany({
        where: {
          date: targetDateDb,
          status: "PENDIENTE",
          user: { organizationId: holiday.organizationId },
          ...(holiday.locationId ? { locationId: holiday.locationId } : {}),
        },
        data: {
          status: "FERIADO",
          statusChangedAt: new Date(),
          statusChangedBy: "CRON_EOD",
        },
      })
    )
  );
}

const TIME_OFF_STATUS_MAP: Record<string, string> = {
  VACACIONES: "VACACIONES",
  DESCANSO_MEDICO: "DESCANSO_MEDICO",
};

async function applyTimeOffAndDayOffStatuses(targetDateDb: Date): Promise<void> {
  const [approvedTimeOffs, dayOffOverrides] = await Promise.all([
    prisma.timeOffRequest.findMany({
      where: { status: "APPROVED", startDate: { lte: targetDateDb }, endDate: { gte: targetDateDb } },
    }),
    prisma.shiftOverride.findMany({
      where: { date: targetDateDb, isDayOff: true },
    }),
  ]);

  await Promise.all([
    ...approvedTimeOffs.map((timeOff) =>
      prisma.attendance.updateMany({
        where: { date: targetDateDb, userId: timeOff.userId, status: "PENDIENTE", entryTime: null },
        data: {
          status: (TIME_OFF_STATUS_MAP[timeOff.type] ?? "PERMISO") as any,
          statusChangedAt: new Date(),
          statusChangedBy: "CRON_EOD",
        },
      })
    ),
    ...dayOffOverrides.map((override) =>
      prisma.attendance.updateMany({
        where: { date: targetDateDb, userId: override.userId, status: "PENDIENTE", entryTime: null },
        data: { status: "DIA_LIBRE", statusChangedAt: new Date(), statusChangedBy: "CRON_EOD" },
      })
    ),
  ]);
}

export async function runDailyCloser(targetDate?: Date): Promise<EodResult> {
  // Por defecto: evaluar el día anterior (auditoría hotelera post-turno nocturno)
  const dateObj = targetDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateStr = getLocalDateString(dateObj, DEFAULT_TIMEZONE);
  const targetDateDb = new Date(`${dateStr}T00:00:00.000Z`);

  console.log(`[EOD] Iniciando cierre de jornada/auditoría para ${dateStr}`);

  try {
    await applyHolidayStatuses(targetDateDb);
    await applyTimeOffAndDayOffStatuses(targetDateDb);

    // 1. Marcar AUSENTE: usuarios con PENDIENTE que nunca registraron entrada
    const resAusentes = await prisma.attendance.updateMany({
      where: {
        date: targetDateDb,
        entryTime: null,
        status: "PENDIENTE",
      },
      data: {
        status: "AUSENTE",
        statusChangedAt: new Date(),
        statusChangedBy: "CRON_EOD",
      },
    });

    // 2. Marcar INCOMPLETO: usuarios que entraron pero no marcaron salida
    const resIncompletos = await prisma.attendance.updateMany({
      where: {
        date: targetDateDb,
        entryTime: { not: null },
        exitTime: null,
        status: {
          notIn: ["JUSTIFICADO", "PERMISO", "ABANDONO_PUESTO", "FERIADO", "DIA_LIBRE", "VACACIONES", "DESCANSO_MEDICO"],
        },
      },
      data: {
        status: "INCOMPLETO",
        statusChangedAt: new Date(),
        statusChangedBy: "CRON_EOD",
      },
    });

    // Notificar resumen de salidas sin marcar / abandonos por organización
    const openOrAbandoned = await prisma.attendance.findMany({
      where: {
        date: targetDateDb,
        status: { in: ["INCOMPLETO", "ABANDONO_PUESTO"] },
      },
      select: {
        status: true,
        user: { select: { organizationId: true } },
      },
    });

    const incidentsByOrg = new Map<string, { incomplete: number; abandoned: number }>();
    for (const row of openOrAbandoned) {
      const orgId = row.user.organizationId;
      const current = incidentsByOrg.get(orgId) ?? { incomplete: 0, abandoned: 0 };
      if (row.status === "INCOMPLETO") current.incomplete++;
      else if (row.status === "ABANDONO_PUESTO") current.abandoned++;
      incidentsByOrg.set(orgId, current);
    }

    await Promise.all(
      Array.from(incidentsByOrg.entries()).map(([organizationId, counts]) => {
        const parts: string[] = [];
        if (counts.incomplete > 0) parts.push(`${counts.incomplete} sin salida registrada`);
        if (counts.abandoned > 0) parts.push(`${counts.abandoned} abandono(s) de puesto`);
        return notifySupervisorsInOrg({
          organizationId,
          type: "ABANDONO_REGISTRADO",
          title: `Resumen de cierre (${dateStr})`,
          body: `Incidencias detectadas al cierre de jornada: ${parts.join(" y ")}.`,
          url: "/asistencias",
          tag: `eod-summary-${dateStr}`,
          data: { category: "EOD_SUMMARY", date: dateStr, ...counts },
        });
      })
    );

    // 3. Procesar asistencias con entrada y salida
    const completeAttendances = await prisma.attendance.findMany({
      where: {
        date: targetDateDb,
        entryTime: { not: null },
        exitTime: { not: null },
        status: {
          in: ["PENDIENTE", "PRESENTE", "TARDE"],
        },
      },
      include: {
        user: {
          include: {
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
        },
      },
    });

    const workedResults = await Promise.all(
      completeAttendances.map(async (att) => {
        if (!att.entryTime || !att.exitTime) return 0;

        const diff1Ms = att.exitTime.getTime() - att.entryTime.getTime();
        let totalWorkedMinutes = Math.max(0, Math.round(diff1Ms / (1000 * 60)));

        if (att.entryTime2 && att.exitTime2) {
          const diff2Ms = att.exitTime2.getTime() - att.entryTime2.getTime();
          totalWorkedMinutes += Math.max(0, Math.round(diff2Ms / (1000 * 60)));
        }

        const schedule = att.user.userSchedules[0]?.schedule;
        let lateMinutes = att.lateMinutes ?? 0;
        let newStatus: AttendanceStatus = att.status === "TARDE" ? "TARDE" : "PRESENTE";

        if (schedule && att.status === "PENDIENTE") {
          const { hour: entryHour, minute: entryMin } = getLocalTimeParts(att.entryTime, DEFAULT_TIMEZONE);
          const expectedEntryMinutes = schedule.entryHour * 60 + schedule.entryMinute;
          const actualEntryMinutes = entryHour * 60 + entryMin;
          const diffEntry = actualEntryMinutes - expectedEntryMinutes;
          if (diffEntry > (schedule.toleranceMinutes || 0)) {
            newStatus = "TARDE";
            lateMinutes = Math.max(0, diffEntry);
          } else {
            newStatus = "PRESENTE";
            lateMinutes = 0;
          }
        }

        const finalExitDate = att.exitTime2 || att.exitTime;
        const overtime =
          att.overtimeStatus === "NONE" && finalExitDate
            ? computeOvertime(finalExitDate, schedule, DEFAULT_TIMEZONE)
            : null;

        await prisma.attendance.update({
          where: { id: att.id },
          data: {
            workedMinutes: att.workedMinutes ?? totalWorkedMinutes,
            lateMinutes: att.lateMinutes ?? (schedule ? lateMinutes : null),
            ...(overtime && overtime.overtimeMinutes > 0
              ? {
                  overtimeMinutes: overtime.overtimeMinutes,
                  overtimeStatus: overtime.overtimeStatus,
                }
              : {}),
            status: newStatus,
            statusChangedAt: new Date(),
            statusChangedBy: "CRON_EOD",
          },
        });

        return totalWorkedMinutes;
      })
    );

    const completadosCount = completeAttendances.filter((att) => att.entryTime && att.exitTime).length;
    const minutosCalculadosCount = workedResults.reduce((sum, mins) => sum + mins, 0);

    console.log(
      `[EOD] Cierre completado: ${resAusentes.count} ausentes, ${resIncompletos.count} incompletos, ${completadosCount} completados.`
    );

    return {
      success: true,
      action: "daily-close",
      date: dateStr,
      ausentes: resAusentes.count,
      incompletos: resIncompletos.count,
      completados: completadosCount,
      tardes_presentes: completadosCount,
      minutosCalculados: minutosCalculadosCount,
      minutos_calculados: minutosCalculadosCount,
      message: `Cierre completado: ${resAusentes.count} ausentes, ${resIncompletos.count} incompletos, ${completadosCount} asistencias calculadas.`,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("[EOD] Error en cierre de jornada:", error);
    return {
      success: false,
      action: "daily-close",
      date: dateStr,
      ausentes: 0,
      incompletos: 0,
      completados: 0,
      minutosCalculados: 0,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}
