import { prisma } from "@asistencias/db";

export async function checkToleranceWeeklyLimit(
  userId: string,
  organizationSettings: any,
  today: Date, // Date esperado a medianoche UTC (@db.Date de Prisma)
  actualTotalMinutes: number,
  scheduledMinutes: number,
  tolerance: number
): Promise<{
  isLate: boolean;
  diffLate: number;
  usedTolerance: boolean;
  exceededTolerance: boolean;
  isLastTolerance: boolean;
}> {
  let isLate = false;
  let diffLate = 0;
  let usedTolerance = false;
  let exceededTolerance = false;
  let isLastTolerance = false;

  const diff = actualTotalMinutes - (scheduledMinutes + tolerance);

  if (diff > 0) {
    isLate = true;
    diffLate = actualTotalMinutes - scheduledMinutes;
  } else if (actualTotalMinutes > scheduledMinutes) {
    usedTolerance = true;

    // Check weekly limit
    const maxWeeklyTolerances = organizationSettings?.maxWeeklyTolerances ?? 2; // Default 2

    // Cálculo estricto de inicio de semana en UTC para concordar con columnas @db.Date
    const startOfWeek = new Date(today.getTime());
    const utcDay = startOfWeek.getUTCDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    // Calcular días a restar para llegar al lunes de esta semana
    const daysToSubtract = utcDay === 0 ? 6 : utcDay - 1;
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - daysToSubtract);
    startOfWeek.setUTCHours(0, 0, 0, 0);

    const weeklyAttendances = await prisma.attendance.count({
      where: {
        userId,
        date: { gte: startOfWeek, lte: today },
        usedTolerance: true,
      },
    });

    if (weeklyAttendances >= maxWeeklyTolerances) {
      isLate = true;
      exceededTolerance = true;
      diffLate = actualTotalMinutes - scheduledMinutes;
    } else if (weeklyAttendances + 1 >= maxWeeklyTolerances) {
      isLastTolerance = true;
    }
  }

  return { isLate, diffLate, usedTolerance, exceededTolerance, isLastTolerance };
}
