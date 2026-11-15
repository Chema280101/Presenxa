import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/audit";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateKioskSchema = z.object({
  name: z.string().min(1).optional(),
  locationId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

function checkAdminOrSupervisor(session: any) {
  const role = session?.user?.role;
  return ["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(role);
}

// GET /api/kiosks/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!checkAdminOrSupervisor(session)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
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

  if (!checkAdminOrSupervisor(session)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
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

    // Validar que la nueva sede pertenezca a la misma organización
    if (parsed.data.locationId && parsed.data.locationId !== existing.locationId) {
      const validLoc = await prisma.location.findFirst({
        where: {
          id: parsed.data.locationId,
          organizationId: session.user.organizationId,
        },
      });
      if (!validLoc) {
        return NextResponse.json(
          { error: "La sede de destino no pertenece a tu organización" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.kiosk.update({
      where: { id },
      data: parsed.data,
      include: {
        location: { select: { id: true, name: true } },
      },
    });

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "ENTITY_UPDATED",
      entityType: "KIOSK",
      entityId: updated.id,
      oldData: { name: existing.name, locationId: existing.locationId, isActive: existing.isActive },
      newData: { name: updated.name, locationId: updated.locationId, isActive: updated.isActive },
      req,
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

  if (!checkAdminOrSupervisor(session)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
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

    await prisma.kiosk.update({
      where: { id },
      data: { isActive: false },
    });

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "ENTITY_DELETED",
      entityType: "KIOSK",
      entityId: existing.id,
      oldData: { name: existing.name, isActive: existing.isActive },
      newData: { name: existing.name, isActive: false },
      req,
    });

    return NextResponse.json({ success: true, message: "Kiosk desactivado exitosamente" });
  } catch (error: any) {
    console.error("Error al desactivar kiosk:", error);
    return NextResponse.json({ error: "Error al desactivar kiosk" }, { status: 500 });
  }
}
