import { prisma, AttendanceStatus } from "@asistencias/db";
import { format } from "date-fns";

export interface EodResult {
  success: boolean;
  action: string;
  date: string;
  ausentes: number;
  incompletos: number;
  completados: number;
  minutosCalculados: number;
  message?: string;
  error?: string;
  timestamp: string;
}

/**
 * Cierre de Jornada (EOD - End Of Day):
 * Procesa todos los registros de asistencia del día laboral:
 * 1. PENDIENTE sin entrada -> AUSENTE
 * 2. Entrada sin salida -> INCOMPLETO
 * 3. Entrada + Salida -> Calcula lateMinutes, workedMinutes y clasifica TARDE o PRESENTE.
 */
export async function runDailyCloser(targetDate?: Date): Promise<EodResult> {
  const dateObj = targetDate || new Date();
  const dateStr = format(dateObj, "yyyy-MM-dd");
  const targetDateDb = new Date(`${dateStr}T00:00:00.000Z`);

  console.log(`[EOD] Iniciando cierre de jornada para ${dateStr}`);

  try {
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
          notIn: ["JUSTIFICADO", "PERMISO", "ABANDONO_PUESTO"],
        },
      },
      data: {
        status: "INCOMPLETO",
        statusChangedAt: new Date(),
        statusChangedBy: "CRON_EOD",
      },
    });

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

    let completadosCount = 0;
    let minutosCalculadosCount = 0;

    for (const att of completeAttendances) {
      if (!att.entryTime || !att.exitTime) continue;

      // Calcular minutos trabajados Tramo 1
      const diff1Ms = att.exitTime.getTime() - att.entryTime.getTime();
      let totalWorkedMinutes = Math.max(0, Math.round(diff1Ms / (1000 * 60)));

      // Tramo 2 si aplica
      if (att.entryTime2 && att.exitTime2) {
        const diff2Ms = att.exitTime2.getTime() - att.entryTime2.getTime();
        totalWorkedMinutes += Math.max(0, Math.round(diff2Ms / (1000 * 60)));
      }

      const schedule = att.user.userSchedules[0]?.schedule;
      let lateMinutes = att.lateMinutes ?? 0;
      let newStatus: AttendanceStatus = "PRESENTE";

      if (schedule) {
        // Horario esperado Tramo 1
        const entryDate = new Date(att.entryTime);
        const expectedEntryMinutes = schedule.entryHour * 60 + schedule.entryMinute;
        const actualEntryMinutes = entryDate.getHours() * 60 + entryDate.getMinutes();

        const diffEntry = actualEntryMinutes - expectedEntryMinutes;
        lateMinutes = Math.max(0, diffEntry - schedule.toleranceMinutes);

        if (diffEntry > schedule.toleranceMinutes) {
          newStatus = "TARDE";
        } else {
          newStatus = "PRESENTE";
        }
      }

      await prisma.attendance.update({
        where: { id: att.id },
        data: {
          workedMinutes: att.workedMinutes ?? totalWorkedMinutes,
          lateMinutes: schedule ? lateMinutes : att.lateMinutes,
          status: newStatus,
          statusChangedAt: new Date(),
          statusChangedBy: "CRON_EOD",
        },
      });

      completadosCount++;
      minutosCalculadosCount += totalWorkedMinutes;
    }

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
      minutosCalculados: minutosCalculadosCount,
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
