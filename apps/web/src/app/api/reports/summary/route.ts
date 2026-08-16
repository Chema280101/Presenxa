import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { AttendanceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { startOfMonth, endOfMonth, parseISO, format } from "date-fns";

// GET /api/reports/summary?month=2026-08
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // "YYYY-MM"
  const locationId = searchParams.get("locationId");

  const baseDate = monthParam ? parseISO(`${monthParam}-01`) : new Date();
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);

  const where: any = {
    user: {
      organizationId: session.user.organizationId,
    },
    date: {
      gte: monthStart,
      lte: monthEnd,
    },
  };

  if (locationId) {
    where.locationId = locationId;
  }

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
      prisma.user.count({
        where: {
          organizationId: session.user.organizationId,
          isActive: true,
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

    // Day by day aggregation
    const dayMap: Record<string, { date: string; present: number; late: number; absent: number; abandoned: number }> = {};

    attendances.forEach((att) => {
      const dateKey = format(new Date(att.date), "yyyy-MM-dd");
      if (!dayMap[dateKey]) {
        dayMap[dateKey] = {
          date: dateKey,
          present: 0,
          late: 0,
          absent: 0,
          abandoned: 0,
        };
      }

      if (att.status === AttendanceStatus.PRESENTE) dayMap[dateKey].present++;
      else if (att.status === AttendanceStatus.TARDE) dayMap[dateKey].late++;
      else if (att.status === AttendanceStatus.AUSENTE) dayMap[dateKey].absent++;
      else if (att.status === AttendanceStatus.ABANDONO_PUESTO) dayMap[dateKey].abandoned++;
    });

    const dailyBreakdown = Object.values(dayMap);

    return NextResponse.json({
      month: format(baseDate, "yyyy-MM"),
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
    });
  } catch (error: any) {
    console.error("Error al generar resumen de reportes:", error);
    return NextResponse.json(
      { error: "Error al generar resumen de reportes" },
      { status: 500 }
    );
  }
}
