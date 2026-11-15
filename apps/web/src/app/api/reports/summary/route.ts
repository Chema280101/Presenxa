import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { AttendanceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { startOfMonth, endOfMonth, parseISO, format } from "date-fns";

interface LateSeverity {
  tolerance: number;
  light: number;
  severe: number;
  critical: number;
}

function classifyLateSeverity(lateMinutes: number | null, severity: LateSeverity): void {
  if (!lateMinutes) return;
  if (lateMinutes <= 5) severity.tolerance++;
  else if (lateMinutes <= 15) severity.light++;
  else if (lateMinutes <= 30) severity.severe++;
  else severity.critical++;
}

function aggregateDailyAndSeverity(
  attendances: Array<{ date: Date; status: AttendanceStatus; lateMinutes: number | null }>
) {
  const dayMap: Record<
    string,
    { date: string; present: number; late: number; absent: number; abandoned: number }
  > = {};
  const lateSeverity: LateSeverity = { tolerance: 0, light: 0, severe: 0, critical: 0 };

  for (const att of attendances) {
    const dateKey = format(new Date(att.date), "yyyy-MM-dd");
    if (!dayMap[dateKey]) {
      dayMap[dateKey] = { date: dateKey, present: 0, late: 0, absent: 0, abandoned: 0 };
    }

    if (att.status === AttendanceStatus.PRESENTE) dayMap[dateKey].present++;
    else if (att.status === AttendanceStatus.TARDE) {
      dayMap[dateKey].late++;
      classifyLateSeverity(att.lateMinutes, lateSeverity);
    } else if (att.status === AttendanceStatus.AUSENTE) dayMap[dateKey].absent++;
    else if (att.status === AttendanceStatus.ABANDONO_PUESTO) dayMap[dateKey].abandoned++;
  }

  return { dailyBreakdown: Object.values(dayMap), lateSeverity };
}

function buildSummaryWhereClause(
  organizationId: string,
  searchParams: URLSearchParams
) {
  const monthParam = searchParams.get("month");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const locationId = searchParams.get("locationId");
  const departmentId = searchParams.get("departmentId");
  const roleParam = searchParams.get("role");
  const userId = searchParams.get("userId");

  const baseDate = monthParam ? parseISO(`${monthParam}-01`) : new Date();
  const rangeStart = startDateParam && endDateParam ? parseISO(startDateParam) : startOfMonth(baseDate);
  const rangeEnd = startDateParam && endDateParam ? parseISO(endDateParam) : endOfMonth(baseDate);

  const where: any = {
    user: { organizationId },
    date: { gte: rangeStart, lte: rangeEnd },
  };
  if (userId && userId !== "ALL") where.userId = userId;
  if (locationId && locationId !== "ALL") where.locationId = locationId;
  if (departmentId && departmentId !== "ALL") where.user.departmentId = departmentId;
  if (roleParam && roleParam !== "ALL") where.user.role = roleParam;

  return { where, rangeStart, monthParam, userId, locationId, departmentId, roleParam };
}

// GET /api/reports/summary?month=2026-08
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as any)?.role;
  if (!["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(role)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const { where, rangeStart, monthParam, userId, locationId, departmentId, roleParam } =
    buildSummaryWhereClause(session.user.organizationId, searchParams);

  try {
    const [attendances, totalUsers] = await Promise.all([
      prisma.attendance.findMany({
        where,
        orderBy: { date: "asc" },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
          location: { select: { id: true, name: true } },
        },
      }),
      userId && userId !== "ALL"
        ? Promise.resolve(1)
        : prisma.user.count({
            where: {
              organizationId: session.user.organizationId,
              isActive: true,
              ...(departmentId && departmentId !== "ALL" ? { departmentId } : {}),
              ...(locationId && locationId !== "ALL" ? { locationId } : {}),
              ...(roleParam && roleParam !== "ALL" ? { role: roleParam as any } : {}),
            },
          }),
    ]);

    const totalRecords = attendances.length;
    const presentCount = attendances.filter(
      (a) => a.status === AttendanceStatus.PRESENTE
    ).length;
    const lateCount = attendances.filter(
      (a) => a.status === AttendanceStatus.TARDE
    ).length;
    const absentCount = attendances.filter(
      (a) => a.status === AttendanceStatus.AUSENTE
    ).length;
    const abandonedCount = attendances.filter(
      (a) => a.status === AttendanceStatus.ABANDONO_PUESTO
    ).length;
    const justifiedCount = attendances.filter(
      (a) =>
        a.status === AttendanceStatus.JUSTIFICADO ||
        a.status === AttendanceStatus.PERMISO
    ).length;

    const totalLateMinutes = attendances.reduce(
      (acc, a) => acc + (a.lateMinutes || 0),
      0
    );

    const punctualPercentage = totalRecords
      ? Math.round((presentCount / totalRecords) * 100)
      : 0;

    const attendanceRate = totalRecords
      ? Math.round(((presentCount + lateCount) / totalRecords) * 100)
      : 0;

    const { dailyBreakdown, lateSeverity } = aggregateDailyAndSeverity(attendances);

    return NextResponse.json({
      month: monthParam || format(rangeStart, "yyyy-MM"),
      totalUsers,
      totalRecords,
      presentCount,
      lateCount,
      absentCount,
      abandonedCount,
      justifiedCount,
      totalLateMinutes,
      punctualPercentage,
      attendanceRate,
      dailyBreakdown,
      lateSeverity,
    });
  } catch (error: any) {
    console.error("Error al generar resumen de reportes:", error);
    return NextResponse.json(
      { error: "Error al generar resumen de reportes" },
      { status: 500 }
    );
  }
}
