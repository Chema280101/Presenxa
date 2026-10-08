import { prisma } from "@asistencias/db";

export async function checkToleranceWeeklyLimit(
  userId: string,
  organizationSettings: any,
  today: Date,
  actualTotalMinutes: number,
  scheduledMinutes: number,
  tolerance: number
): Promise<{ isLate: boolean; diffLate: number; usedTolerance: boolean; exceededTolerance: boolean }> {
  let isLate = false;
  let diffLate = 0;
  let usedTolerance = false;
  let exceededTolerance = false;

  const diff = actualTotalMinutes - (scheduledMinutes + tolerance);

  if (diff > 0) {
    isLate = true;
    diffLate = actualTotalMinutes - scheduledMinutes;
  } else if (actualTotalMinutes > scheduledMinutes) {
    usedTolerance = true;

    // Check weekly limit
    const maxWeeklyTolerances = organizationSettings?.maxWeeklyTolerances ?? 2; // Default 2

    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    // Monday as first day of week
    const diffDays = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diffDays);
    startOfWeek.setHours(0, 0, 0, 0);

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
    }
  }

  return { isLate, diffLate, usedTolerance, exceededTolerance };
}
