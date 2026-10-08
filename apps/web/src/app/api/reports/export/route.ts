import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { es } from "date-fns/locale";

import { generateAttendanceExcelWorkbook } from "@/lib/exportAttendanceExcel";

// GET /api/reports/export?period=TODAY|WEEK|MONTH|CUSTOM&startDate=...&endDate=...&locationId=...&role=...&format=xlsx|csv
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
  const departmentId = searchParams.get("departmentId");
  const roleParam = searchParams.get("role");
  const userId = searchParams.get("userId");
  const formatParam = (searchParams.get("format") || "xlsx").toLowerCase();

  const now = new Date();
  let start: Date;
  let end: Date;
  let periodLabel = "";

  switch (period) {
    case "TODAY":
      start = startOfDay(now);
      end = endOfDay(now);
      periodLabel = `Diario (${format(now, "dd/MM/yyyy")})`;
      break;

    case "WEEK":
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
      periodLabel = `Semanal (${format(start, "dd/MM/yyyy")} - ${format(end, "dd/MM/yyyy")})`;
      break;

    case "MONTH":
      if (startDateParam && startDateParam.length === 7) {
        const baseDate = parseISO(`${startDateParam}-01`);
        start = startOfMonth(baseDate);
        end = endOfMonth(baseDate);
      } else {
        start = startOfMonth(now);
        end = endOfMonth(now);
      }
      periodLabel = `Mensual (${format(start, "MMMM yyyy", { locale: es })})`;
      break;

    case "CUSTOM":
    default:
      if (startDateParam && endDateParam) {
        start = startOfDay(parseISO(startDateParam));
        end = endOfDay(parseISO(endDateParam));
        periodLabel = `Personalizado (${format(start, "dd/MM/yyyy")} - ${format(end, "dd/MM/yyyy")})`;
      } else {
        start = startOfMonth(now);
        end = endOfMonth(now);
        periodLabel = `Mensual (${format(start, "MMMM yyyy", { locale: es })})`;
      }
      break;
  }

  const userWhere: any = {
    organizationId: session.user.organizationId,
  };
  if (roleParam && roleParam !== "ALL") {
    userWhere.role = roleParam;
  }
  if (departmentId && departmentId !== "ALL") {
    userWhere.departmentId = departmentId;
  }
  if (userId && userId !== "ALL") {
    userWhere.id = userId;
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
    const [organization, attendances, targetUser] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { name: true, settings: true },
      }),
      prisma.attendance.findMany({
        where,
        orderBy: [{ date: "asc" }, { entryTime: "asc" }],
        include: {
          user: true,
          location: true,
          kiosk: true,
        },
      }),
      userId && userId !== "ALL"
        ? prisma.user.findFirst({
            where: {
              id: userId,
              organizationId: session.user.organizationId,
            },
            select: { firstName: true, lastName: true, documentId: true },
          })
        : Promise.resolve(null),
    ]);

    const orgSettings = (organization?.settings as any) || {};
    const companyName = organization?.name || "Empresa";
    const ruc = orgSettings.ruc ? `RUC: ${orgSettings.ruc}` : "";

    const sanitizedOrg = companyName.replace(/[^a-zA-Z0-9]/g, "_");
    const workerName = targetUser
      ? `${targetUser.lastName}, ${targetUser.firstName}`
      : undefined;
    const workerDocumentId = targetUser?.documentId || undefined;
    const userSlug = targetUser
      ? `_${(targetUser.lastName + "_" + targetUser.firstName).replace(/[^a-zA-Z0-9]/g, "_")}`
      : "";
    const filePrefix = targetUser ? "Kardex_Asistencia" : "Reporte_Asistencia";

    // Si se solicita formato XLSX (predeterminado)
    if (formatParam !== "csv") {
      const workbook = await generateAttendanceExcelWorkbook({
        attendances: attendances as any,
        companyName,
        ruc: orgSettings.ruc || undefined,
        periodLabel,
        workerName,
        workerDocumentId,
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `${filePrefix}_${sanitizedOrg}${userSlug}_${format(now, "yyyyMMdd_HHmm")}.xlsx`;

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Formato CSV UTF-8 con BOM para sistemas legados o externos
    const metaHeader = [
      targetUser
        ? `"KARDEX OFICIAL DE ASISTENCIA INDIVIDUAL - ${companyName.toUpperCase()}"`
        : `"REPORTE OFICIAL DE ASISTENCIA - ${companyName.toUpperCase()}"`,
      targetUser
        ? `"Colaborador: ${targetUser.lastName}, ${targetUser.firstName} (DNI: ${targetUser.documentId || "S/D"}) - Periodo: ${periodLabel} - Generado: ${format(now, "dd/MM/yyyy HH:mm:ss")}"`
        : `"${ruc} - Periodo: ${periodLabel} - Generado: ${format(now, "dd/MM/yyyy HH:mm:ss")}"`,
      `"Total Registros: ${attendances.length} - Software: Presenxa Control Inteligente"`,
      "", // blank line
    ];

    const tableHeader = [
      "Fecha",
      "Documento / DNI",
      "Apellidos y Nombres",
      "Correo Electrónico",
      "Rol",
      "Sede / Ubicación",
      "Kiosk de Registro",
      "Entrada T1",
      "Salida T1 (Receso)",
      "Entrada T2 (Retorno)",
      "Salida T2 (Final)",
      "Horas Trabajadas",
      "Estado",
      "Minutos Tardanza",
      "Notas / Justificación",
      "Auditado Por",
    ].join(";");

    const rows = attendances.map((a) => {
      const dateStr = format(new Date(a.date), "dd/MM/yyyy");
      const entryStr = a.entryTime ? format(new Date(a.entryTime), "HH:mm:ss") : "--:--:--";
      const exitStr = a.exitTime ? format(new Date(a.exitTime), "HH:mm:ss") : "--:--:--";
      const entry2Str = a.entryTime2 ? format(new Date(a.entryTime2), "HH:mm:ss") : "--:--:--";
      const exit2Str = a.exitTime2 ? format(new Date(a.exitTime2), "HH:mm:ss") : "--:--:--";
      const fullName = `"${a.user.lastName}, ${a.user.firstName}"`;
      const notes = a.notes ? `"${a.notes.replace(/"/g, '""')}"` : "";
      const workedHours = a.workedMinutes ? (a.workedMinutes / 60).toFixed(2) + " hrs" : "0.00 hrs";

      return [
        dateStr,
        `"${a.user.documentId || ""}"`,
        fullName,
        a.user.email,
        a.user.role,
        `"${a.location?.name || "Sin sede"}"`,
        `"${a.kiosk?.name || "Virtual"}"`,
        entryStr,
        exitStr,
        entry2Str,
        exit2Str,
        workedHours,
        a.status,
        a.lateMinutes || 0,
        notes,
        `"${a.statusChangedBy || ""}"`,
      ].join(";");
    });

    const csvContent = "\uFEFF" + [...metaHeader, tableHeader, ...rows].join("\r\n");
    const filename = `${filePrefix}_${sanitizedOrg}${userSlug}_${format(now, "yyyyMMdd_HHmm")}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error al exportar reporte:", error);
    return NextResponse.json({ error: "Error al exportar" }, { status: 500 });
  }
}
