import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateKioskSchema = z.object({
  name: z.string().min(1).optional(),
  locationId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/kiosks/[id]
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
    const kiosk = await prisma.kiosk.findFirst({
      where: {
        id,
        location: { organizationId: session.user.organizationId },
      },
      include: {
        location: true,
        _count: { select: { attendances: true } },
      },
    });

    if (!kiosk) {
      return NextResponse.json({ error: "Kiosk no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ kiosk });
  } catch (error: any) {
    console.error("Error al obtener kiosk:", error);
    return NextResponse.json({ error: "Error al obtener kiosk" }, { status: 500 });
  }
}

// PUT /api/kiosks/[id]
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
    const parsed = UpdateKioskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const existing = await prisma.kiosk.findFirst({
      where: {
        id,
        location: { organizationId: session.user.organizationId },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kiosk no encontrado" }, { status: 404 });
    }

    const updated = await prisma.kiosk.update({
      where: { id },
      data: parsed.data,
      include: {
        location: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ kiosk: updated });
  } catch (error: any) {
    console.error("Error al actualizar kiosk:", error);
    return NextResponse.json({ error: "Error al actualizar kiosk" }, { status: 500 });
  }
}

// DELETE /api/kiosks/[id]
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
    const existing = await prisma.kiosk.findFirst({
      where: {
        id,
        location: { organizationId: session.user.organizationId },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kiosk no encontrado" }, { status: 404 });
    }

    const kiosk = await prisma.kiosk.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Kiosk desactivado correctamente", kiosk });
  } catch (error: any) {
    console.error("Error al desactivar kiosk:", error);
    return NextResponse.json({ error: "Error al desactivar kiosk" }, { status: 500 });
  }
}
