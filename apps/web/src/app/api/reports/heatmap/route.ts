import { auth } from "@/auth";
import { prisma, AttendanceStatus } from "@asistencias/db";
import { NextResponse } from "next/server";
import { startOfMonth, endOfMonth, parseISO, format } from "date-fns";
import { getLocalTimeParts } from "@/lib/dateUtils";

// GET /api/reports/heatmap?startDate=...&endDate=...&month=...&locationId=...&role=...
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // "YYYY-MM"
  const startDateParam = searchParams.get("startDate"); // "YYYY-MM-DD"
  const endDateParam = searchParams.get("endDate"); // "YYYY-MM-DD"
  const locationId = searchParams.get("locationId");
  const role = searchParams.get("role");

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

  // Get organization timezone
  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { settings: true },
  });
  const timezone = (org?.settings as any)?.timezone || "America/Lima";

  const where: any = {
    user: {
      organizationId: session.user.organizationId,
      ...(role && role !== "ALL" ? { role: role as any } : {}),
    },
    date: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (locationId && locationId !== "ALL") {
    where.locationId = locationId;
  }

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
          organizationId: session.user.organizationId,
          isActive: true,
          ...(role && role !== "ALL" ? { role: role as any } : {}),
          ...(locationId && locationId !== "ALL" ? { locationId } : {}),
        },
      }),
    ]);

    // ── 1. Construir Matriz de Horas Pico (7 Días × 24 Horas) ──────────────
    // Días: 1: Lunes, 2: Martes, 3: Miércoles, 4: Jueves, 5: Viernes, 6: Sábado, 0: Domingo
    const peakHoursMatrix: Array<{
      dayOfWeek: number; // 0 to 6 (0 = Dom, 1 = Lun)
      dayName: string;
      hour: number; // 0 to 23
      entries: number;
      exits: number;
      lates: number;
      onTime: number;
      totalTraffic: number;
      avgLateMinutes: number;
    }> = [];

    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    // Inicializar matriz completa 7 x 24
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        peakHoursMatrix.push({
          dayOfWeek: d,
          dayName: dayNames[d],
          hour: h,
          entries: 0,
          exits: 0,
          lates: 0,
          onTime: 0,
          totalTraffic: 0,
          avgLateMinutes: 0,
        });
      }
    }

    const lateMinutesSumByCell: Record<string, { sum: number; count: number }> = {};

    attendances.forEach((att) => {
      // 1.1 Analizar Entrada Tramo 1
      if (att.entryTime) {
        const entryDate = new Date(att.entryTime);
        const { hour: localH } = getLocalTimeParts(entryDate, timezone);
        const localDay = new Date(entryDate.toLocaleString("en-US", { timeZone: timezone })).getDay();

        const cell = peakHoursMatrix.find((c) => c.dayOfWeek === localDay && c.hour === localH);
        if (cell) {
          cell.entries++;
          cell.totalTraffic++;
          if (att.status === AttendanceStatus.TARDE || (att.lateMinutes && att.lateMinutes > 0)) {
            cell.lates++;
            const key = `${localDay}-${localH}`;
            if (!lateMinutesSumByCell[key]) lateMinutesSumByCell[key] = { sum: 0, count: 0 };
            lateMinutesSumByCell[key].sum += att.lateMinutes || 0;
            lateMinutesSumByCell[key].count++;
          } else if (att.status === AttendanceStatus.PRESENTE) {
            cell.onTime++;
          }
        }
      }

      // 1.2 Analizar Entrada Tramo 2 (si aplica)
      if (att.entryTime2) {
        const entryDate2 = new Date(att.entryTime2);
        const { hour: localH } = getLocalTimeParts(entryDate2, timezone);
        const localDay = new Date(entryDate2.toLocaleString("en-US", { timeZone: timezone })).getDay();

        const cell = peakHoursMatrix.find((c) => c.dayOfWeek === localDay && c.hour === localH);
        if (cell) {
          cell.entries++;
          cell.totalTraffic++;
        }
      }

      // 1.3 Analizar Salida Tramo 1
      if (att.exitTime) {
        const exitDate = new Date(att.exitTime);
        const { hour: localH } = getLocalTimeParts(exitDate, timezone);
        const localDay = new Date(exitDate.toLocaleString("en-US", { timeZone: timezone })).getDay();

        const cell = peakHoursMatrix.find((c) => c.dayOfWeek === localDay && c.hour === localH);
        if (cell) {
          cell.exits++;
          cell.totalTraffic++;
        }
      }

      // 1.4 Analizar Salida Tramo 2
      if (att.exitTime2) {
        const exitDate2 = new Date(att.exitTime2);
        const { hour: localH } = getLocalTimeParts(exitDate2, timezone);
        const localDay = new Date(exitDate2.toLocaleString("en-US", { timeZone: timezone })).getDay();

        const cell = peakHoursMatrix.find((c) => c.dayOfWeek === localDay && c.hour === localH);
        if (cell) {
          cell.exits++;
          cell.totalTraffic++;
        }
      }
    });

    // Calcular promedios de tardanza por celda
    peakHoursMatrix.forEach((cell) => {
      const key = `${cell.dayOfWeek}-${cell.hour}`;
      if (lateMinutesSumByCell[key] && lateMinutesSumByCell[key].count > 0) {
        cell.avgLateMinutes = Math.round(lateMinutesSumByCell[key].sum / lateMinutesSumByCell[key].count);
      }
    });

    // ── 2. Matriz de Ausentismo y Tardanzas por Sede / Rol ──────────────────
    const locationStatsMap: Record<
      string,
      {
        id: string;
        name: string;
        totalRecords: number;
        presentCount: number;
        lateCount: number;
        absentCount: number;
        abandonedCount: number;
        justifiedCount: number;
        daysBreakdown: Record<number, { present: number; late: number; absent: number; total: number }>;
      }
    > = {};

    locations.forEach((loc) => {
      locationStatsMap[loc.id] = {
        id: loc.id,
        name: loc.name,
        totalRecords: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        abandonedCount: 0,
        justifiedCount: 0,
        daysBreakdown: {
          1: { present: 0, late: 0, absent: 0, total: 0 },
          2: { present: 0, late: 0, absent: 0, total: 0 },
          3: { present: 0, late: 0, absent: 0, total: 0 },
          4: { present: 0, late: 0, absent: 0, total: 0 },
          5: { present: 0, late: 0, absent: 0, total: 0 },
          6: { present: 0, late: 0, absent: 0, total: 0 },
          0: { present: 0, late: 0, absent: 0, total: 0 },
        },
      };
    });

    // Desglose por Rol
    const roleStatsMap: Record<
      string,
      {
        role: string;
        totalRecords: number;
        presentCount: number;
        lateCount: number;
        absentCount: number;
        abandonedCount: number;
        daysBreakdown: Record<number, { present: number; late: number; absent: number; total: number }>;
      }
    > = {
      EMPLEADO: { role: "Empleado", totalRecords: 0, presentCount: 0, lateCount: 0, absentCount: 0, abandonedCount: 0, daysBreakdown: {} },
      SUPERVISOR: { role: "Supervisor", totalRecords: 0, presentCount: 0, lateCount: 0, absentCount: 0, abandonedCount: 0, daysBreakdown: {} },
      ALUMNO: { role: "Alumno", totalRecords: 0, presentCount: 0, lateCount: 0, absentCount: 0, abandonedCount: 0, daysBreakdown: {} },
      ADMIN: { role: "Administrador", totalRecords: 0, presentCount: 0, lateCount: 0, absentCount: 0, abandonedCount: 0, daysBreakdown: {} },
    };

    [0, 1, 2, 3, 4, 5, 6].forEach((d) => {
      Object.keys(roleStatsMap).forEach((r) => {
        roleStatsMap[r].daysBreakdown[d] = { present: 0, late: 0, absent: 0, total: 0 };
      });
    });

    attendances.forEach((att) => {
      const locId = att.locationId;
      const attRole = att.user.role || "EMPLEADO";
      const attDate = new Date(att.date);
      const localDay = new Date(attDate.toLocaleString("en-US", { timeZone: timezone })).getDay();

      if (locId && locationStatsMap[locId]) {
        const l = locationStatsMap[locId];
        l.totalRecords++;
        l.daysBreakdown[localDay].total++;

        if (att.status === AttendanceStatus.PRESENTE) {
          l.presentCount++;
          l.daysBreakdown[localDay].present++;
        } else if (att.status === AttendanceStatus.TARDE) {
          l.lateCount++;
          l.daysBreakdown[localDay].late++;
        } else if (att.status === AttendanceStatus.AUSENTE) {
          l.absentCount++;
          l.daysBreakdown[localDay].absent++;
        } else if (att.status === AttendanceStatus.ABANDONO_PUESTO) {
          l.abandonedCount++;
          l.daysBreakdown[localDay].absent++;
        } else if (att.status === AttendanceStatus.JUSTIFICADO || att.status === AttendanceStatus.PERMISO) {
          l.justifiedCount++;
        }
      }

      if (roleStatsMap[attRole]) {
        const r = roleStatsMap[attRole];
        r.totalRecords++;
        r.daysBreakdown[localDay].total++;
        if (att.status === AttendanceStatus.PRESENTE) {
          r.presentCount++;
          r.daysBreakdown[localDay].present++;
        } else if (att.status === AttendanceStatus.TARDE) {
          r.lateCount++;
          r.daysBreakdown[localDay].late++;
        } else if (att.status === AttendanceStatus.AUSENTE) {
          r.absentCount++;
          r.daysBreakdown[localDay].absent++;
        } else if (att.status === AttendanceStatus.ABANDONO_PUESTO) {
          r.abandonedCount++;
        }
      }
    });

    const locationPatterns = Object.values(locationStatsMap).map((l) => {
      const absenteeismRate = l.totalRecords ? Math.round(((l.absentCount + l.abandonedCount) / l.totalRecords) * 100) : 0;
      const lateRate = l.totalRecords ? Math.round((l.lateCount / l.totalRecords) * 100) : 0;
      const punctualityRate = l.totalRecords ? Math.round((l.presentCount / l.totalRecords) * 100) : 0;

      return {
        id: l.id,
        name: l.name,
        totalRecords: l.totalRecords,
        presentCount: l.presentCount,
        lateCount: l.lateCount,
        absentCount: l.absentCount,
        abandonedCount: l.abandonedCount,
        justifiedCount: l.justifiedCount,
        absenteeismRate,
        lateRate,
        punctualityRate,
        daysBreakdown: l.daysBreakdown,
      };
    });

    const rolePatterns = Object.values(roleStatsMap)
      .filter((r) => r.totalRecords > 0)
      .map((r) => {
        const absenteeismRate = r.totalRecords ? Math.round(((r.absentCount + r.abandonedCount) / r.totalRecords) * 100) : 0;
        const lateRate = r.totalRecords ? Math.round((r.lateCount / r.totalRecords) * 100) : 0;
        const punctualityRate = r.totalRecords ? Math.round((r.presentCount / r.totalRecords) * 100) : 0;

        return {
          role: r.role,
          totalRecords: r.totalRecords,
          presentCount: r.presentCount,
          lateCount: r.lateCount,
          absentCount: r.absentCount,
          abandonedCount: r.abandonedCount,
          absenteeismRate,
          lateRate,
          punctualityRate,
          daysBreakdown: r.daysBreakdown,
        };
      });

    // ── 3. Insights Ejecutivos Calculados ──────────────────────────────────
    let maxEntryCell = peakHoursMatrix[0];
    let maxExitCell = peakHoursMatrix[0];
    let maxLateCell = peakHoursMatrix[0];

    peakHoursMatrix.forEach((c) => {
      if (c.entries > maxEntryCell.entries) maxEntryCell = c;
      if (c.exits > maxExitCell.exits) maxExitCell = c;
      if (c.lates > maxLateCell.lates) maxLateCell = c;
    });

    // Total de entradas
    const totalEntries = peakHoursMatrix.reduce((acc, c) => acc + c.entries, 0);
    const totalExits = peakHoursMatrix.reduce((acc, c) => acc + c.exits, 0);
    const totalLates = peakHoursMatrix.reduce((acc, c) => acc + c.lates, 0);

    // Día con mayor afluencia (solo si hay entradas registradas)
    const dayTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };
    peakHoursMatrix.forEach((c) => {
      dayTotals[c.dayOfWeek] += c.entries;
    });
    
    let busiestDayName = "Sin datos";
    if (totalEntries > 0) {
      const busiestDayIndex = Object.keys(dayTotals).reduce((a, b) => (dayTotals[Number(a)] > dayTotals[Number(b)] ? a : b), "1");
      busiestDayName = dayNames[Number(busiestDayIndex)];
    }

    // Sede con mayor ausentismo
    const sortedByAbsent = [...locationPatterns].sort((a, b) => b.absenteeismRate - a.absenteeismRate);
    const highestAbsentLocation = sortedByAbsent[0]?.name || "N/A";

    const hasEntries = totalEntries > 0 && maxEntryCell.entries > 0;
    const hasExits = totalExits > 0 && maxExitCell.exits > 0;
    const hasLates = totalLates > 0 && maxLateCell.lates > 0;

    const insights = {
      busiestDay: busiestDayName,
      peakEntryWindow: hasEntries ? `${String(maxEntryCell.hour).padStart(2, "0")}:00 - ${String(maxEntryCell.hour + 1).padStart(2, "0")}:00` : "",
      peakEntryDay: hasEntries ? maxEntryCell.dayName : "",
      peakEntryCount: hasEntries ? maxEntryCell.entries : 0,
      peakExitWindow: hasExits ? `${String(maxExitCell.hour).padStart(2, "0")}:00 - ${String(maxExitCell.hour + 1).padStart(2, "0")}:00` : "",
      peakExitDay: hasExits ? maxExitCell.dayName : "",
      peakExitCount: hasExits ? maxExitCell.exits : 0,
      criticalLateDay: hasLates ? maxLateCell.dayName : "",
      criticalLateWindow: hasLates ? `${String(maxLateCell.hour).padStart(2, "0")}:00 - ${String(maxLateCell.hour + 1).padStart(2, "0")}:00` : "",
      criticalLateCount: hasLates ? maxLateCell.lates : 0,
      highestAbsentLocation,
      totalEntries,
      totalExits,
      totalLates,
      totalUsers,
    };

    return NextResponse.json({
      success: true,
      peakHoursMatrix,
      locationPatterns,
      rolePatterns,
      insights,
      timeZone: timezone,
    });
  } catch (error: any) {
    console.error("Error al generar heatmap de asistencias:", error);
    return NextResponse.json({ error: "Error interno al calcular mapas de calor" }, { status: 500 });
  }
}
