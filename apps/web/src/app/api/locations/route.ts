import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/audit";
import { parsePaginationParams, buildPaginationMeta } from "@/lib/pagination";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const LocationSchema = z.object({
  name: z.string().min(1, "El nombre de la sede es obligatorio"),
  address: z.string().optional().nullable(),
  timezone: z.string().default("America/Lima"),
});

// GET /api/locations
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const { hasPagination, page, pageSize, skip, take } = parsePaginationParams(
      searchParams,
      25
    );

    const where: any = {
      organizationId: session.user.organizationId,
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    const [locations, total] = await Promise.all([
      prisma.location.findMany({
        where,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        skip,
        take,
        include: {
          _count: {
            select: {
              users: { where: { isActive: true } },
              kiosks: { where: { isActive: true } },
              attendances: true,
            },
          },
        },
      }),
      hasPagination ? prisma.location.count({ where }) : Promise.resolve(0),
    ]);

    if (hasPagination) {
      return NextResponse.json({
        locations,
        pagination: buildPaginationMeta(page, pageSize, total),
      });
    }

    return NextResponse.json({ locations });
  } catch (error: any) {
    console.error("Error al obtener sedes:", error);
    return NextResponse.json({ error: "Error al obtener sedes" }, { status: 500 });
  }
}

// POST /api/locations
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as any)?.role;
  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = LocationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const location = await prisma.location.create({
      data: {
        organizationId: session.user.organizationId,
        name: data.name,
        address: data.address || null,
        timezone: data.timezone,
        isActive: true,
      },
    });

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "ENTITY_CREATED",
      entityType: "LOCATION",
      entityId: location.id,
      newData: { name: location.name, address: location.address, timezone: location.timezone },
      req,
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear sede:", error);
    return NextResponse.json({ error: "Error al crear sede" }, { status: 500 });
  }
}
