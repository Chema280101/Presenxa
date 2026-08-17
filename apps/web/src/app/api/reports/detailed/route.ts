import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { AttendanceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
  format,
} from "date-fns";
import { es } from "date-fns/locale";

// GET /api/reports/detailed?period=TODAY|WEEK|MONTH|CUSTOM&startDate=...&endDate=...&locationId=...&role=...
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "MONTH";
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const locationId = searchParams.get("locationId");
  const roleParam = searchParams.get("role");

  const now = new Date();
  let start: Date;
  let end: Date;
  let periodLabel = "";

  switch (period) {
    case "TODAY":
      start = startOfDay(now);
      end = endOfDay(now);
      periodLabel = `Diario: ${format(now, "dd 'de' MMMM, yyyy", { locale: es })}`;
      break;

    case "WEEK":
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
      periodLabel = `Semanal: Del ${format(start, "dd/MM/yyyy")} al ${format(end, "dd/MM/yyyy")}`;
      break;

    case "MONTH":
      if (startDateParam && startDateParam.length === 7) {
        // "YYYY-MM"
        const baseDate = parseISO(`${startDateParam}-01`);
        start = startOfMonth(baseDate);
        end = endOfMonth(baseDate);
      } else {
        start = startOfMonth(now);
        end = endOfMonth(now);
      }
      periodLabel = `Mensual: ${format(start, "MMMM yyyy", { locale: es }).toUpperCase()}`;
      break;

    case "CUSTOM":
    default:
      if (startDateParam && endDateParam) {
        start = startOfDay(parseISO(startDateParam));
        end = endOfDay(parseISO(endDateParam));
        periodLabel = `Periodo: Del ${format(start, "dd/MM/yyyy")} al ${format(end, "dd/MM/yyyy")}`;
      } else {
        start = startOfMonth(now);
        end = endOfMonth(now);
        periodLabel = `Mensual: ${format(start, "MMMM yyyy", { locale: es }).toUpperCase()}`;
      }
      break;
  }

  const userWhere: any = {
    organizationId: session.user.organizationId,
  };
  if (roleParam && roleParam !== "ALL") {
    userWhere.role = roleParam;
  }

  const where: any = {
    user: userWhere,
    date: {
      gte: start,
      lte: end,
    },
  };

  if (locationId && locationId !== "ALL") {
    where.locationId = locationId;
  }

  try {
    const [organization, attendances] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: {
          id: true,
          name: true,
          type: true,
          slug: true,
          logoUrl: true,
          settings: true,
        },
      }),
      prisma.attendance.findMany({
        where,
        orderBy: [{ date: "asc" }, { entryTime: "asc" }],
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              documentId: true,
              role: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
          kiosk: {
            select: {
              name: true,
            },
          },
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

    const totalWorkedMinutes = attendances.reduce(
      (acc, a) => acc + (a.workedMinutes || 0),
      0
    );

    const punctualPercentage =
      totalRecords > 0 ? Math.round((presentCount / (presentCount + lateCount || 1)) * 100) : 100;

    const attendanceRate =
      totalRecords > 0 ? Math.round(((presentCount + lateCount) / totalRecords) * 100) : 0;

    return NextResponse.json({
      organization,
      periodLabel,
      generatedAt: format(now, "dd/MM/yyyy HH:mm:ss"),
      metrics: {
        totalRecords,
        presentCount,
        lateCount,
        absentCount,
        abandonedCount,
        justifiedCount,
        totalLateMinutes,
        totalWorkedMinutes,
        totalWorkedHours: (totalWorkedMinutes / 60).toFixed(1),
        punctualPercentage,
        attendanceRate,
      },
      attendances,
    });
  } catch (error: any) {
    console.error("[REPORTS_DETAILED_ERROR]", error);
    return NextResponse.json(
      { error: "Error al generar reporte detallado" },
      { status: 500 }
    );
  }
}
