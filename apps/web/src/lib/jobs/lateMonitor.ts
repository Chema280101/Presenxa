import { prisma } from "@asistencias/db";
import { format } from "date-fns";

export interface LateMonitorResult {
  success: boolean;
  action: string;
  date: string;
  checkedCount: number;
  lateDetectedCount: number;
  message?: string;
  error?: string;
  timestamp: string;
}

/**
 * Monitor de Tardanzas:
 * Revisa usuarios con horario programado para hoy cuya hora límite de tolerancia ya venció
 * y que aún no han registrado entrada.
 */
export async function runLateMonitor(targetDate?: Date): Promise<LateMonitorResult> {
  const now = new Date();
  const dateObj = targetDate || now;
  const dateStr = format(dateObj, "yyyy-MM-dd");
  const targetDateDb = new Date(`${dateStr}T00:00:00.000Z`);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  console.log(`[LATE_MONITOR] Verificando tardanzas a las ${currentHour}:${String(currentMinute).padStart(2, "0")}`);

  try {
    // Buscar registros PENDIENTE del día de hoy
    const pendingAttendances = await prisma.attendance.findMany({
      where: {
        date: targetDateDb,
        entryTime: null,
        status: "PENDIENTE",
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

    let lateDetectedCount = 0;

    for (const att of pendingAttendances) {
      const schedule = att.user.userSchedules[0]?.schedule;
      if (!schedule) continue;

      const scheduleEntryMinutes = schedule.entryHour * 60 + schedule.entryMinute;
      const limitMinutes = scheduleEntryMinutes + schedule.toleranceMinutes;

      // Si la hora actual superó la hora de entrada + tolerancia
      if (currentTotalMinutes > limitMinutes) {
        lateDetectedCount++;

        // Crear notificación si aún no existe una para hoy
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: att.userId,
            type: "LLEGADA_TARDE",
            createdAt: {
              gte: targetDateDb,
            },
          },
        });

        if (!existingNotification) {
          const minutesLate = currentTotalMinutes - scheduleEntryMinutes;
          await prisma.notification.create({
            data: {
              userId: att.userId,
              type: "LLEGADA_TARDE",
              title: "Alerta de Tardanza",
              body: `Tu horario de ingreso era a las ${String(schedule.entryHour).padStart(2, "0")}:${String(schedule.entryMinute).padStart(2, "0")}. Llevas ${minutesLate} min de retraso.`,
              data: {
                attendanceId: att.id,
                minutesLate,
              },
            },
          });
        }
      }
    }

    console.log(`[LATE_MONITOR] Verificación completada: ${lateDetectedCount} tardanzas detectadas.`);

    return {
      success: true,
      action: "check-late",
      date: dateStr,
      checkedCount: pendingAttendances.length,
      lateDetectedCount,
      message: `Verificación completada: ${lateDetectedCount} usuarios fuera de tiempo detectados.`,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("[LATE_MONITOR] Error verificando tardanzas:", error);
    return {
      success: false,
      action: "check-late",
      date: dateStr,
      checkedCount: 0,
      lateDetectedCount: 0,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}
