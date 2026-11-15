import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/audit";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateLocationSchema = z.object({
  name: z.string().min(1, "El nombre de la sede es obligatorio").optional(),
  address: z.string().optional().nullable(),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
});

function checkAdminOrSupervisor(session: any) {
  const role = session?.user?.role;
  return ["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(role);
}

// GET /api/locations/[id]
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
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role as string);

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
          select: {
            id: true,
            name: true,
            apiKey: isAdmin, // Solo admins ven apiKey
            isActive: true,
            lastSeenAt: true,
          },
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

  const role = (session.user as any)?.role;
  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
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

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "ENTITY_UPDATED",
      entityType: "LOCATION",
      entityId: updated.id,
      oldData: { name: existing.name, address: existing.address, timezone: existing.timezone, isActive: existing.isActive },
      newData: { name: updated.name, address: updated.address, timezone: updated.timezone, isActive: updated.isActive },
      req,
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

  const role = (session.user as any)?.role;
  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
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

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "ENTITY_DELETED",
      entityType: "LOCATION",
      entityId: location.id,
      oldData: { name: existing.name, isActive: existing.isActive },
      newData: { name: location.name, isActive: location.isActive },
      req,
    });

    return NextResponse.json({ message: "Sede desactivada correctamente", location });
  } catch (error: any) {
    console.error("Error al desactivar sede:", error);
    return NextResponse.json({ error: "Error al desactivar sede" }, { status: 500 });
  }
}
