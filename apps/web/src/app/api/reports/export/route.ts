import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";

// GET /api/reports/export?startDate=...&endDate=...
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const locationId = searchParams.get("locationId");

  const where: any = {
    user: { organizationId: session.user.organizationId },
  };

  if (startDateParam && endDateParam) {
    where.date = {
      gte: startOfDay(parseISO(startDateParam)),
      lte: endOfDay(parseISO(endDateParam)),
    };
  }

  if (locationId) {
    where.locationId = locationId;
  }

  try {
    const attendances = await prisma.attendance.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        user: true,
        location: true,
        kiosk: true,
      },
    });

    // Generate CSV UTF-8 with BOM for Excel compatibility
    const header = [
      "Fecha",
      "Documento / DNI",
      "Apellidos y Nombres",
      "Correo",
      "Rol",
      "Sede",
      "Hora Entrada",
      "Hora Salida",
      "Estado",
      "Minutos Tardanza",
      "Minutos Trabajados",
      "Notas / Justificación",
      "Modificado Por",
    ].join(";");

    const rows = attendances.map((a) => {
      const dateStr = format(new Date(a.date), "dd/MM/yyyy");
      const entryStr = a.entryTime ? format(new Date(a.entryTime), "HH:mm:ss") : "";
      const exitStr = a.exitTime ? format(new Date(a.exitTime), "HH:mm:ss") : "";
      const fullName = `"${a.user.lastName}, ${a.user.firstName}"`;
      const notes = a.notes ? `"${a.notes.replace(/"/g, '""')}"` : "";

      return [
        dateStr,
        a.user.documentId || "",
        fullName,
        a.user.email,
        a.user.role,
        `"${a.location?.name || ""}"`,
        entryStr,
        exitStr,
        a.status,
        a.lateMinutes || 0,
        a.workedMinutes || 0,
        notes,
        a.statusChangedBy || "",
      ].join(";");
    });

    const csvContent = "\uFEFF" + [header, ...rows].join("\r\n");

    const filename = `Reporte_Asistencias_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;

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
