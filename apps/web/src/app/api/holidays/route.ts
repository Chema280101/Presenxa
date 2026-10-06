import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@asistencias/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const organizationId = (session.user as any).organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 400 });
    }

    const holidays = await prisma.holiday.findMany({
      where: { organizationId },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ holidays });
  } catch (error: any) {
    console.error("[Holidays API] Error fetching holidays:", error);
    return NextResponse.json({ error: "Error interno al obtener feriados" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const organizationId = (session.user as any).organizationId;
    const body = await req.json();
    const { name, date, locationId } = body;

    if (!name || !date) {
      return NextResponse.json({ error: "El nombre y la fecha son obligatorios" }, { status: 400 });
    }

    // Usar mediodía UTC para evitar desplazamientos por zona horaria
    const holidayDate = new Date(`${date}T12:00:00Z`);

    const holiday = await prisma.holiday.create({
      data: {
        name: name.trim(),
        date: holidayDate,
        organizationId,
        locationId: locationId || null,
        isActive: true,
      },
    });

    return NextResponse.json({ holiday }, { status: 201 });
  } catch (error: any) {
    console.error("[Holidays API] Error creating holiday:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un feriado registrado para esta fecha" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al registrar el feriado" }, { status: 500 });
  }
}
