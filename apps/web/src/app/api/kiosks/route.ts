import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/audit";
import { parsePaginationParams, buildPaginationMeta } from "@/lib/pagination";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

const CreateKioskSchema = z.object({
  name: z.string().min(1, "El nombre del kiosk es obligatorio"),
  locationId: z.string().uuid("Selecciona una sede válida"),
});

// GET /api/kiosks
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRole = (session.user as any).role;
  if (!["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(userRole)) {
    return NextResponse.json(
      { error: "No tienes permiso para ver los kioskos" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const locationId = searchParams.get("locationId");
    const { hasPagination, page, pageSize, skip, take } = parsePaginationParams(
      searchParams,
      25
    );

    const where: any = {
      location: {
        organizationId: session.user.organizationId,
      },
    };
    if (locationId && locationId !== "ALL") {
      where.locationId = locationId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { location: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [kiosks, total] = await Promise.all([
      prisma.kiosk.findMany({
        where,
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        skip,
        take,
        include: {
          location: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          _count: {
            select: {
              attendances: true,
            },
          },
        },
      }),
      hasPagination ? prisma.kiosk.count({ where }) : Promise.resolve(0),
    ]);

    if (hasPagination) {
      return NextResponse.json({
        kiosks,
        pagination: buildPaginationMeta(page, pageSize, total),
      });
    }

    return NextResponse.json({ kiosks });
  } catch (error: any) {
    console.error("Error al obtener kiosks:", error);
    return NextResponse.json(
      { error: "Error al obtener dispositivos kiosk" },
      { status: 500 }
    );
  }
}

// POST /api/kiosks
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRole = (session.user as any).role;
  if (!["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(userRole)) {
    return NextResponse.json(
      { error: "No tienes permiso para registrar dispositivos kiosk" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = CreateKioskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, locationId } = parsed.data;

    // Verify location belongs to organization
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        organizationId: session.user.organizationId,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "La sede especificada no existe o no pertenece a tu organización" },
        { status: 404 }
      );
    }

    const apiKey = crypto.randomUUID();

    const kiosk = await prisma.kiosk.create({
      data: {
        name,
        locationId,
        apiKey,
        isActive: true,
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
      },
    });

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "ENTITY_CREATED",
      entityType: "KIOSK",
      entityId: kiosk.id,
      newData: { name: kiosk.name, locationId: kiosk.locationId, locationName: kiosk.location?.name },
      req,
    });

    return NextResponse.json({ kiosk }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear kiosk:", error);
    return NextResponse.json(
      { error: "Error al crear dispositivo kiosk" },
      { status: 500 }
    );
  }
}
