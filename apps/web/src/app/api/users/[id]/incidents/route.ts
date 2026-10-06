import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, AttendanceStatus } from "@asistencias/db";
import { subMonths, startOfWeek, endOfWeek, subDays, format } from "date-fns";
import { es } from "date-fns/locale";

function getDateStr(dateVal: Date | string): string {
  if (dateVal instanceof Date) {
    return dateVal.toISOString().slice(0, 10);
  }
  return String(dateVal).slice(0, 10);
}

function calculateMetrics(records: any[]) {
  const lates = records.filter(
    (a) => a.status === AttendanceStatus.TARDE || (a.lateMinutes && a.lateMinutes > 0)
  );
  const lateMinutesTotal = lates.reduce((acc, a) => acc + (a.lateMinutes || 0), 0);
  const absencesCount = records.filter(
    (a) => a.status === AttendanceStatus.AUSENTE || a.status === AttendanceStatus.ABANDONO_PUESTO
  ).length;
  const justifiedCount = records.filter(
    (a) => a.status === AttendanceStatus.JUSTIFICADO || a.status === AttendanceStatus.PERMISO
  ).length;
  const presentsCount = records.filter((a) => a.status === AttendanceStatus.PRESENTE).length;
  const totalRecords = records.length;

  const evaluatedPunctuality = presentsCount + lates.length;
  const punctualityRate = evaluatedPunctuality > 0
    ? Math.round((presentsCount / evaluatedPunctuality) * 100)
    : 100;

  return {
    latesCount: lates.length,
    lateMinutesTotal,
    absencesCount,
    justifiedCount,
    presentsCount,
    totalRecords,
    punctualityRate,
  };
}

// GET /api/users/[id]/incidents
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const userRole = (session.user as any).role;

  if (userRole === "EMPLEADO" && id !== session.user.id) {
    return NextResponse.json({ error: "No tienes permiso" }, { status: 403 });
  }

  try {
    // Verificar que el usuario pertenece a la organización
    const user = await prisma.user.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });
    }

    const now = new Date();
    const windowStart = subDays(now, 120); // 120 días para capturar bien los meses anteriores
    windowStart.setHours(0, 0, 0, 0);

    // Obtener todas las asistencias del rango
    const attendances = await prisma.attendance.findMany({
      where: {
        userId: id,
        date: { gte: windowStart },
      },
      orderBy: { date: "desc" },
      include: {
        location: {
          select: { name: true },
        },
      },
    });

    // Fechas y claves de período (formato YYYY-MM)
    const currentMonthKey = format(now, "yyyy-MM");
    const prevMonthDate = subMonths(now, 1);
    const prevMonthKey = format(prevMonthDate, "yyyy-MM");

    const currentMonthLabel = format(now, "MMMM yyyy", { locale: es });
    const prevMonthLabel = format(prevMonthDate, "MMMM yyyy", { locale: es });

    const weekStartDate = startOfWeek(now, { weekStartsOn: 1 });
    const weekEndDate = endOfWeek(now, { weekStartsOn: 1 });
    const weekStartStr = format(weekStartDate, "yyyy-MM-dd");
    const weekEndStr = format(weekEndDate, "yyyy-MM-dd");

    // Filtrar registros por período con comparación de cadenas ISO (100% inmune a timezones)
    const currentMonthRecords = attendances.filter((a) => getDateStr(a.date).startsWith(currentMonthKey));
    const prevMonthRecords = attendances.filter((a) => getDateStr(a.date).startsWith(prevMonthKey));
    const weekRecords = attendances.filter((a) => {
      const d = getDateStr(a.date);
      return d >= weekStartStr && d <= weekEndStr;
    });

    // ── Incidencias (No PRESENTE o con tardanza > 0) ─────
    const incidentRecords = attendances
      .filter((a) => a.status !== AttendanceStatus.PRESENTE || (a.lateMinutes && a.lateMinutes > 0))
      .slice(0, 30)
      .map((a) => ({
        id: a.id,
        date: a.date,
        dateStr: getDateStr(a.date),
        monthKey: getDateStr(a.date).slice(0, 7),
        status: a.status,
        lateMinutes: a.lateMinutes,
        entryTime: a.entryTime,
        exitTime: a.exitTime,
        notes: a.notes,
        locationName: a.location?.name,
      }));

    return NextResponse.json({
      periods: {
        currentMonth: {
          key: currentMonthKey,
          label: currentMonthLabel,
          shortName: format(now, "MMMM", { locale: es }),
          metrics: calculateMetrics(currentMonthRecords),
        },
        previousMonth: {
          key: prevMonthKey,
          label: prevMonthLabel,
          shortName: format(prevMonthDate, "MMMM", { locale: es }),
          metrics: calculateMetrics(prevMonthRecords),
        },
        week: {
          key: "week",
          label: "Esta Semana",
          rangeLabel: `${format(weekStartDate, "d 'de' MMM", { locale: es })} - ${format(weekEndDate, "d 'de' MMM", { locale: es })}`,
          metrics: calculateMetrics(weekRecords),
        },
        all90Days: {
          key: "all90Days",
          label: "Últimos 90 Días",
          metrics: calculateMetrics(attendances),
        },
      },
      // Compatibilidad hacia atrás
      metrics: {
        week: calculateMetrics(weekRecords),
        month: calculateMetrics(currentMonthRecords),
      },
      totalIncidentsCount: incidentRecords.length,
      incidents: incidentRecords,
    });
  } catch (error: any) {
    console.error("Error al obtener incidencias del colaborador:", error);
    return NextResponse.json(
      { error: "Error al calcular historial de incidencias" },
      { status: 500 }
    );
  }
}

