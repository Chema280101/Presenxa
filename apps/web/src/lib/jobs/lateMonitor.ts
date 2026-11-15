import { prisma } from "@asistencias/db";
import { getLocalDateString, getLocalTimeParts, DEFAULT_TIMEZONE } from "@/lib/dateUtils";
import { sendPushToSupervisors } from "@/lib/webPush";
import { notifySupervisorsInOrg, notifyUserWithPush } from "@/lib/notifications";

export interface LateMonitorResult {
  success: boolean;
  action: string;
  date: string;
  checkedCount: number;
  lateDetectedCount: number;
  currentTime?: string;
  unmarkedCount?: number;
  alertsCreated?: number;
  supervisorsNotified?: number;
  message?: string;
  error?: string;
  timestamp: string;
}

/**
 * Monitor de Tardanzas:
 * Revisa usuarios con horario programado para hoy cuya hora límite de tolerancia ya venció
 * y que aún no han registrado entrada.
 */
async function checkOfflineKiosks(now: Date): Promise<number> {
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const offlineKiosks = await prisma.kiosk.findMany({
    where: {
      isActive: true,
      OR: [
        { lastSeenAt: { lt: tenMinutesAgo } },
        { lastSeenAt: null, createdAt: { lt: tenMinutesAgo } },
      ],
    },
    include: {
      location: { select: { id: true, name: true, organizationId: true } },
    },
  });

  let alerted = 0;
  for (const kiosk of offlineKiosks) {
    const existingAlert = await prisma.notification.findFirst({
      where: {
        createdAt: { gte: twoHoursAgo },
        user: { organizationId: kiosk.location.organizationId },
        data: { path: ["kioskId"], equals: kiosk.id },
      },
      select: { id: true },
    });

    if (existingAlert) continue;

    await notifySupervisorsInOrg({
      organizationId: kiosk.location.organizationId,
      type: "FALTA_REGISTRADA",
      title: `Kiosk desconectado: ${kiosk.name}`,
      body: `El tótem de ${kiosk.location.name} lleva más de 10 minutos sin enviar heartbeat.`,
      url: "/kiosks",
      tag: `kiosk-offline-${kiosk.id}`,
      data: { category: "KIOSK_OFFLINE", kioskId: kiosk.id, locationId: kiosk.location.id },
    });
    alerted++;
  }

  return alerted;
}

async function checkPendingExitReminders(
  targetDateDb: Date,
  dateStr: string,
  currentMinutes: number
): Promise<number> {
  const openAttendances = await prisma.attendance.findMany({
    where: {
      date: targetDateDb,
      entryTime: { not: null },
      exitTime: null,
      status: { in: ["PRESENTE", "TARDE"] },
    },
    include: {
      user: {
        include: {
          userSchedules: {
            where: { OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }] },
            include: { schedule: true },
            orderBy: { validFrom: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  let remindersSent = 0;
  for (const att of openAttendances) {
    const schedule = att.user.userSchedules[0]?.schedule;
    if (!schedule) continue;
    const isOvernight =
      schedule.exitHour < schedule.entryHour ||
      (schedule.exitHour === schedule.entryHour && schedule.exitMinute < schedule.entryMinute);
    if (isOvernight) continue;

    const scheduledExitMinutes =
      schedule.isSplit && schedule.exitHour2 !== null
        ? schedule.exitHour2 * 60 + (schedule.exitMinute2 || 0)
        : schedule.exitHour * 60 + schedule.exitMinute;

    if (currentMinutes < scheduledExitMinutes + 15) continue;

    const alreadyReminded = await prisma.notification.findFirst({
      where: {
        userId: att.userId,
        type: "RECORDATORIO_SALIDA",
        createdAt: { gte: targetDateDb },
      },
      select: { id: true },
    });

    if (alreadyReminded) continue;

    await notifyUserWithPush({
      userId: att.userId,
      type: "RECORDATORIO_SALIDA",
      title: "Recordatorio de salida",
      body: "Tu turno ya finalizó y aún no registras tu marcación de salida en el kiosk.",
      url: "/app",
      tag: `exit-reminder-${dateStr}-${att.userId}`,
      data: { category: "EXIT_REMINDER", attendanceId: att.id },
    });
    remindersSent++;
  }

  return remindersSent;
}

export async function runLateMonitor(targetDate?: Date): Promise<LateMonitorResult> {
  const now = new Date();
  const dateObj = targetDate || now;
  const dateStr = getLocalDateString(dateObj, DEFAULT_TIMEZONE);
  const targetDateDb = new Date(`${dateStr}T00:00:00.000Z`);

  const { hour: currentHour, minute: currentMinute } = getLocalTimeParts(now, DEFAULT_TIMEZONE);
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const currentTimeFormatted = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;

  console.log(`[LATE_MONITOR] Verificando tardanzas a las ${currentTimeFormatted} (${DEFAULT_TIMEZONE})`);

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
            shiftOverrides: {
              where: { date: targetDateDb },
              include: { schedule: true },
              take: 1,
            },
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
    let alertsCreated = 0;
    const lateByOrg = new Map<string, string[]>();

    for (const att of pendingAttendances) {
      const override = att.user.shiftOverrides[0];
      if (override?.isDayOff) continue;
      const schedule = override?.schedule || att.user.userSchedules[0]?.schedule;
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
          alertsCreated++;

          const fullName = `${att.user.firstName} ${att.user.lastName}`.trim();
          const list = lateByOrg.get(att.user.organizationId) ?? [];
          list.push(`${fullName} (+${minutesLate} min)`);
          lateByOrg.set(att.user.organizationId, list);
        }
      }
    }

    let supervisorsNotified = 0;
    for (const [organizationId, lateUsers] of lateByOrg.entries()) {
      const preview = lateUsers.slice(0, 3).join(", ");
      const extra = lateUsers.length > 3 ? ` y ${lateUsers.length - 3} más` : "";
      const pushRes = await sendPushToSupervisors(organizationId, {
        title: `⏰ ${lateUsers.length} ${lateUsers.length === 1 ? "tardanza detectada" : "tardanzas detectadas"}`,
        body: `Sin marcar entrada: ${preview}${extra}.`,
        url: "/asistencias",
        tag: `late-monitor-${dateStr}`,
      });
      supervisorsNotified += pushRes.sent;
    }

    const [offlineKiosksAlerted, exitRemindersSent] = await Promise.all([
      checkOfflineKiosks(now),
      checkPendingExitReminders(targetDateDb, dateStr, currentTotalMinutes),
    ]);

    console.log(
      `[LATE_MONITOR] Verificación completada: ${lateDetectedCount} tardanzas detectadas, ${alertsCreated} alertas creadas, ${supervisorsNotified} push a supervisores, ${offlineKiosksAlerted} kiosks offline, ${exitRemindersSent} recordatorios de salida.`
    );

    return {
      success: true,
      action: "check-late",
      date: dateStr,
      currentTime: currentTimeFormatted,
      unmarkedCount: pendingAttendances.length,
      alertsCreated,
      supervisorsNotified,
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
