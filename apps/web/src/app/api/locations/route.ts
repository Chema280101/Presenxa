import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const LocationSchema = z.object({
  name: z.string().min(1, "El nombre de la sede es obligatorio"),
  address: z.string().optional().nullable(),
  timezone: z.string().default("America/Lima"),
  geofenceRadius: z.number().positive("El radio debe ser positivo").default(100),
  geofenceLat: z.number().min(-90).max(90),
  geofenceLng: z.number().min(-180).max(180),
  geofencePolygon: z.any().optional().nullable(),
});

// GET /api/locations
export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const locations = await prisma.location.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            users: { where: { isActive: true } },
            kiosks: { where: { isActive: true } },
            attendances: true,
          },
        },
      },
    });

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
        geofenceRadius: data.geofenceRadius,
        geofenceLat: data.geofenceLat,
        geofenceLng: data.geofenceLng,
        geofencePolygon: data.geofencePolygon || null,
        isActive: true,
      },
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear sede:", error);
    return NextResponse.json({ error: "Error al crear sede" }, { status: 500 });
  }
}
