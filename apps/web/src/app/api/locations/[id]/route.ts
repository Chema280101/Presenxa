import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateLocationSchema = z.object({
  name: z.string().min(1, "El nombre de la sede es obligatorio").optional(),
  address: z.string().optional().nullable(),
  timezone: z.string().optional(),
  geofenceRadius: z.number().positive().optional().nullable(),
  geofenceLat: z.number().min(-90).max(90).optional().nullable(),
  geofenceLng: z.number().min(-180).max(180).optional().nullable(),
  geofencePolygon: z.any().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/locations/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const location = await prisma.location.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      include: {
        users: {
          where: { isActive: true },
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        kiosks: {
          select: { id: true, name: true, apiKey: true, isActive: true, lastSeenAt: true },
        },
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Sede no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ location });
  } catch (error: any) {
    console.error("Error al obtener sede:", error);
    return NextResponse.json({ error: "Error al obtener sede" }, { status: 500 });
  }
}

// PUT /api/locations/[id]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = UpdateLocationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const existing = await prisma.location.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sede no encontrada" }, { status: 404 });
    }

    const updated = await prisma.location.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ location: updated });
  } catch (error: any) {
    console.error("Error al actualizar sede:", error);
    return NextResponse.json({ error: "Error al actualizar sede" }, { status: 500 });
  }
}

// DELETE /api/locations/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.location.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sede no encontrada" }, { status: 404 });
    }

    // Soft delete: set isActive = false
    const location = await prisma.location.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Sede desactivada correctamente", location });
  } catch (error: any) {
    console.error("Error al desactivar sede:", error);
    return NextResponse.json({ error: "Error al desactivar sede" }, { status: 500 });
  }
}
