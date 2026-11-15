import { NextResponse } from "next/server";
import { prisma } from "@asistencias/db";
import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/audit";

export async function PUT(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const existing = await prisma.department.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    const updated = await prisma.department.update({
      where: { 
        id,
        organizationId: session.user.organizationId,
      },
      data: { name: name.trim() },
    });

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "ENTITY_UPDATED",
      entityType: "DEPARTMENT",
      entityId: updated.id,
      oldData: existing ? { name: existing.name } : undefined,
      newData: { name: updated.name },
      req,
    });

    return NextResponse.json({ department: updated });
  } catch (error) {
    console.error("Error en PUT /api/departments/[id]:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const { id } = await params;

    const deleted = await prisma.department.delete({
      where: { 
        id,
        organizationId: session.user.organizationId,
      },
    });

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "ENTITY_DELETED",
      entityType: "DEPARTMENT",
      entityId: deleted.id,
      oldData: { name: deleted.name },
      req,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/departments/[id]:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
