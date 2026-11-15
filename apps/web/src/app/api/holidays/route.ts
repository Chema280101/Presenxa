import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/audit";
import { parsePaginationParams, buildPaginationMeta } from "@/lib/pagination";
import { prisma } from "@asistencias/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const organizationId = (session.user as any).organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const { hasPagination, page, pageSize, skip, take } = parsePaginationParams(
      searchParams,
      25
    );

    const where: any = { organizationId };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [holidays, total] = await Promise.all([
      prisma.holiday.findMany({
        where,
        orderBy: { date: "asc" },
        skip,
        take,
      }),
      hasPagination ? prisma.holiday.count({ where }) : Promise.resolve(0),
    ]);

    if (hasPagination) {
      return NextResponse.json({
        holidays,
        pagination: buildPaginationMeta(page, pageSize, total),
      });
    }

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

    await logAuditEvent({
      organizationId,
      userId: session.user.id,
      action: "ENTITY_CREATED",
      entityType: "HOLIDAY",
      entityId: holiday.id,
      newData: { name: holiday.name, date: date, locationId: holiday.locationId },
      req,
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
