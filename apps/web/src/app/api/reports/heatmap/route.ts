import { auth } from "@/auth";
import { prisma, AttendanceStatus, Prisma, UserRole } from "@asistencias/db";
import { NextResponse } from "next/server";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";
import { DEFAULT_TIMEZONE, getLocalTimeParts } from "@/lib/dateUtils";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

interface PeakHourCell {
  dayOfWeek: number;
  dayName: string;
  hour: number;
  entries: number;
  exits: number;
  lates: number;
  onTime: number;
  totalTraffic: number;
  avgLateMinutes: number;
}

interface DayBreakdown {
  present: number;
  late: number;
  absent: number;
  total: number;
}

interface PatternAccumulator {
  totalRecords: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  abandonedCount: number;
  justifiedCount?: number;
  daysBreakdown: Record<number, DayBreakdown>;
}

function createEmptyDaysBreakdown(): Record<number, DayBreakdown> {
  const breakdown: Record<number, DayBreakdown> = {};
  for (const d of ALL_DAYS) {
    breakdown[d] = { present: 0, late: 0, absent: 0, total: 0 };
  }
  return breakdown;
}

function parseHeatmapDateRange(searchParams: URLSearchParams): { startDate: Date; endDate: Date } | null {
  const monthParam = searchParams.get("month");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  try {
    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = parseISO(startDateParam);
      endDate = parseISO(endDateParam);
    } else if (monthParam) {
      const baseDate = parseISO(`${monthParam}-01`);
      startDate = startOfMonth(baseDate);
      endDate = endOfMonth(baseDate);
    } else {
      const now = new Date();
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return null;
    }
    return { startDate, endDate };
  } catch {
    return null;
  }
}

function getLocalDayAndHour(timestamp: Date | string, timezone: string) {
  const dateObj = new Date(timestamp);
  const { hour } = getLocalTimeParts(dateObj, timezone);
  const day = new Date(dateObj.toLocaleString("en-US", { timeZone: timezone })).getDay();
  return { day, hour };
}

function initEmptyMatrix(): { peakHoursMatrix: PeakHourCell[]; cellMap: Map<string, PeakHourCell> } {
  const peakHoursMatrix: PeakHourCell[] = [];
  const cellMap = new Map<string, PeakHourCell>();

  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const cell: PeakHourCell = {
        dayOfWeek: d,
        dayName: DAY_NAMES[d],
        hour: h,
        entries: 0,
        exits: 0,
        lates: 0,
        onTime: 0,
        totalTraffic: 0,
        avgLateMinutes: 0,
      };
      peakHoursMatrix.push(cell);
      cellMap.set(`${d}-${h}`, cell);
    }
  }
  return { peakHoursMatrix, cellMap };
}

function recordFirstEntry(
  att: { entryTime: Date | null; status: AttendanceStatus; lateMinutes: number | null },
  timezone: string,
  cellMap: Map<string, PeakHourCell>,
  lateMinutesSumByCell: Record<string, { sum: number; count: number }>
) {
  if (!att.entryTime) return;
  const { day, hour } = getLocalDayAndHour(att.entryTime, timezone);
  const key = `${day}-${hour}`;
  const cell = cellMap.get(key);
  if (!cell) return;

  cell.entries++;
  cell.totalTraffic++;
  if (att.status === AttendanceStatus.TARDE || (att.lateMinutes && att.lateMinutes > 0)) {
    cell.lates++;
    if (!lateMinutesSumByCell[key]) lateMinutesSumByCell[key] = { sum: 0, count: 0 };
    lateMinutesSumByCell[key].sum += att.lateMinutes || 0;
    lateMinutesSumByCell[key].count++;
  } else if (att.status === AttendanceStatus.PRESENTE) {
    cell.onTime++;
  }
}

function recordMovement(
  timestamp: Date | null,
  field: "entries" | "exits",
  timezone: string,
  cellMap: Map<string, PeakHourCell>
) {
  if (!timestamp) return;
  const { day, hour } = getLocalDayAndHour(timestamp, timezone);
  const cell = cellMap.get(`${day}-${hour}`);
  if (cell) {
    cell[field]++;
    cell.totalTraffic++;
  }
}

function buildPeakHoursMatrix(
  attendances: Array<{
    entryTime: Date | null;
    entryTime2: Date | null;
    exitTime: Date | null;
    exitTime2: Date | null;
    status: AttendanceStatus;
    lateMinutes: number | null;
  }>,
  timezone: string
): PeakHourCell[] {
  const { peakHoursMatrix, cellMap } = initEmptyMatrix();
  const lateMinutesSumByCell: Record<string, { sum: number; count: number }> = {};

  for (const att of attendances) {
    recordFirstEntry(att, timezone, cellMap, lateMinutesSumByCell);
    recordMovement(att.entryTime2, "entries", timezone, cellMap);
    recordMovement(att.exitTime, "exits", timezone, cellMap);
    recordMovement(att.exitTime2, "exits", timezone, cellMap);
  }

  for (const cell of peakHoursMatrix) {
    const agg = lateMinutesSumByCell[`${cell.dayOfWeek}-${cell.hour}`];
    if (agg && agg.count > 0) {
      cell.avgLateMinutes = Math.round(agg.sum / agg.count);
    }
  }

  return peakHoursMatrix;
}

function accumulateStatusBreakdown(
  target: PatternAccumulator,
  localDay: number,
  status: AttendanceStatus,
  countAbandonInDayAbsent: boolean
) {
  target.totalRecords++;
  target.daysBreakdown[localDay].total++;

  switch (status) {
    case AttendanceStatus.PRESENTE:
      target.presentCount++;
      target.daysBreakdown[localDay].present++;
      break;
    case AttendanceStatus.TARDE:
      target.lateCount++;
      target.daysBreakdown[localDay].late++;
      break;
    case AttendanceStatus.AUSENTE:
      target.absentCount++;
      target.daysBreakdown[localDay].absent++;
      break;
    case AttendanceStatus.ABANDONO_PUESTO:
      target.abandonedCount++;
      if (countAbandonInDayAbsent) {
        target.daysBreakdown[localDay].absent++;
      }
      break;
    case AttendanceStatus.JUSTIFICADO:
    case AttendanceStatus.PERMISO:
      if (target.justifiedCount !== undefined) {
        target.justifiedCount++;
      }
      break;
  }
}

function computeRates(acc: PatternAccumulator) {
  const total = acc.totalRecords;
  return {
    absenteeismRate: total ? Math.round(((acc.absentCount + acc.abandonedCount) / total) * 100) : 0,
    lateRate: total ? Math.round((acc.lateCount / total) * 100) : 0,
    punctualityRate: total ? Math.round((acc.presentCount / total) * 100) : 0,
  };
}

function formatHourWindow(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00 - ${String(hour + 1).padStart(2, "0")}:00`;
}

function findBusiestDayName(dayTotals: Record<number, number>, totalEntries: number): string {
  if (totalEntries <= 0) return "Sin datos";
  const busiestDayIndex = Object.keys(dayTotals).reduce(
    (a, b) => (dayTotals[Number(a)] > dayTotals[Number(b)] ? a : b),
    "1"
  );
  return DAY_NAMES[Number(busiestDayIndex)];
}

function computeHeatmapInsights(
  peakHoursMatrix: PeakHourCell[],
  locationPatterns: Array<{ name: string; absenteeismRate: number }>,
  totalUsers: number
) {
  let maxEntryCell = peakHoursMatrix[0];
  let maxExitCell = peakHoursMatrix[0];
  let maxLateCell = peakHoursMatrix[0];
  let totalEntries = 0;
  let totalExits = 0;
  let totalLates = 0;
  const dayTotals: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  for (const c of peakHoursMatrix) {
    if (c.entries > maxEntryCell.entries) maxEntryCell = c;
    if (c.exits > maxExitCell.exits) maxExitCell = c;
    if (c.lates > maxLateCell.lates) maxLateCell = c;
    totalEntries += c.entries;
    totalExits += c.exits;
    totalLates += c.lates;
    dayTotals[c.dayOfWeek] += c.entries;
  }

  const busiestDay = findBusiestDayName(dayTotals, totalEntries);
  const sortedByAbsent = [...locationPatterns].sort((a, b) => b.absenteeismRate - a.absenteeismRate);

  return {
    busiestDay,
    peakEntryWindow: maxEntryCell.entries > 0 ? formatHourWindow(maxEntryCell.hour) : "",
    peakEntryDay: maxEntryCell.entries > 0 ? maxEntryCell.dayName : "",
    peakEntryCount: maxEntryCell.entries,
    peakExitWindow: maxExitCell.exits > 0 ? formatHourWindow(maxExitCell.hour) : "",
    peakExitDay: maxExitCell.exits > 0 ? maxExitCell.dayName : "",
    peakExitCount: maxExitCell.exits,
    criticalLateDay: maxLateCell.lates > 0 ? maxLateCell.dayName : "",
    criticalLateWindow: maxLateCell.lates > 0 ? formatHourWindow(maxLateCell.hour) : "",
    criticalLateCount: maxLateCell.lates,
    highestAbsentLocation: sortedByAbsent[0]?.name || "N/A",
    totalEntries,
    totalExits,
    totalLates,
    totalUsers,
  };
}

function buildHeatmapPatterns(
  attendances: Array<{ date: Date; locationId: string | null; status: AttendanceStatus; user: { role: UserRole | null } }>,
  locations: Array<{ id: string; name: string }>,
  timezone: string
) {
  const locationStatsMap: Record<string, PatternAccumulator & { id: string; name: string }> = {};
  for (const loc of locations) {
    locationStatsMap[loc.id] = {
      id: loc.id,
      name: loc.name,
      totalRecords: 0,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      abandonedCount: 0,
      justifiedCount: 0,
      daysBreakdown: createEmptyDaysBreakdown(),
    };
  }

  const roleStatsMap: Record<string, PatternAccumulator & { role: string }> = {
    EMPLEADO: { role: "Empleado", totalRecords: 0, presentCount: 0, lateCount: 0, absentCount: 0, abandonedCount: 0, daysBreakdown: createEmptyDaysBreakdown() },
    SUPERVISOR: { role: "Supervisor", totalRecords: 0, presentCount: 0, lateCount: 0, absentCount: 0, abandonedCount: 0, daysBreakdown: createEmptyDaysBreakdown() },
    ADMIN: { role: "Administrador", totalRecords: 0, presentCount: 0, lateCount: 0, absentCount: 0, abandonedCount: 0, daysBreakdown: createEmptyDaysBreakdown() },
  };

  for (const att of attendances) {
    const localDay = new Date(new Date(att.date).toLocaleString("en-US", { timeZone: timezone })).getDay();
    if (att.locationId && locationStatsMap[att.locationId]) {
      accumulateStatusBreakdown(locationStatsMap[att.locationId], localDay, att.status, true);
    }
    const attRole = att.user.role || "EMPLEADO";
    if (roleStatsMap[attRole]) {
      accumulateStatusBreakdown(roleStatsMap[attRole], localDay, att.status, false);
    }
  }

  const locationPatterns = Object.values(locationStatsMap).map((l) => ({
    id: l.id,
    name: l.name,
    totalRecords: l.totalRecords,
    presentCount: l.presentCount,
    lateCount: l.lateCount,
    absentCount: l.absentCount,
    abandonedCount: l.abandonedCount,
    justifiedCount: l.justifiedCount ?? 0,
    ...computeRates(l),
    daysBreakdown: l.daysBreakdown,
  }));

  const rolePatterns = Object.values(roleStatsMap)
    .filter((r) => r.totalRecords > 0)
    .map((r) => ({
      role: r.role,
      totalRecords: r.totalRecords,
      presentCount: r.presentCount,
      lateCount: r.lateCount,
      absentCount: r.absentCount,
      abandonedCount: r.abandonedCount,
      ...computeRates(r),
      daysBreakdown: r.daysBreakdown,
    }));

  return { locationPatterns, rolePatterns };
}

// GET /api/reports/heatmap?startDate=...&endDate=...&month=...&locationId=...&role=...
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string })?.role;
  if (!userRole || !["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(userRole)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dateRange = parseHeatmapDateRange(searchParams);
  if (!dateRange) {
    return NextResponse.json({ error: "Formato de fechas o mes inválido" }, { status: 400 });
  }

  const locationId = searchParams.get("locationId");
  const departmentId = searchParams.get("departmentId");
  const role = searchParams.get("role");
  const userId = searchParams.get("userId");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { settings: true },
  });
  const timezone = (org?.settings as { timezone?: string } | null)?.timezone || DEFAULT_TIMEZONE;

  const userFilter: Prisma.UserWhereInput = {
    organizationId: session.user.organizationId,
    ...(role && role !== "ALL" ? { role: role as UserRole } : {}),
    ...(departmentId && departmentId !== "ALL" ? { departmentId } : {}),
  };

  const where: Prisma.AttendanceWhereInput = {
    user: userFilter,
    date: { gte: dateRange.startDate, lte: dateRange.endDate },
    ...(userId && userId !== "ALL" ? { userId } : {}),
    ...(locationId && locationId !== "ALL" ? { locationId } : {}),
  };

  try {
    const [attendances, locations, totalUsers] = await Promise.all([
      prisma.attendance.findMany({
        where,
        orderBy: { date: "asc" },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, role: true, documentId: true },
          },
          location: { select: { id: true, name: true } },
        },
      }),
      prisma.location.findMany({
        where: { organizationId: session.user.organizationId, isActive: true },
        select: { id: true, name: true },
      }),
      prisma.user.count({
        where: {
          ...userFilter,
          isActive: true,
          ...(locationId && locationId !== "ALL" ? { locationId } : {}),
        },
      }),
    ]);

    const peakHoursMatrix = buildPeakHoursMatrix(attendances, timezone);
    const { locationPatterns, rolePatterns } = buildHeatmapPatterns(attendances, locations, timezone);
    const insights = computeHeatmapInsights(peakHoursMatrix, locationPatterns, totalUsers);

    return NextResponse.json({
      success: true,
      peakHoursMatrix,
      locationPatterns,
      rolePatterns,
      insights,
      timeZone: timezone,
    });
  } catch (error: unknown) {
    console.error("Error al generar heatmap de asistencias:", error);
    return NextResponse.json({ error: "Error interno al calcular mapas de calor" }, { status: 500 });
  }
}
