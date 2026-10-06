import { auth } from "@/auth";
import { prisma, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";

const BulkDeactivateSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, "Debe seleccionar al menos un usuario"),
  reason: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRole = (session.user as any).role;
  const supervisorLocationId = (session.user as any).locationId;

  if (userRole === "EMPLEADO") {
    return NextResponse.json(
      { error: "No tienes permiso para dar de baja colaboradores" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = BulkDeactivateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { userIds, reason } = parsed.data;

    // Protección: no puede desactivarse a sí mismo
    if (userIds.includes(session.user.id)) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta en una acción masiva" },
        { status: 400 }
      );
    }

    // Filtrar solo usuarios de la organización
    const targetUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        organizationId: session.user.organizationId,
        isActive: true, // solo los que siguen activos
        ...(userRole === "SUPERVISOR" && supervisorLocationId ? { locationId: supervisorLocationId } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron colaboradores activos para dar de baja" },
        { status: 404 }
      );
    }

    const validUserIds = targetUsers.map((u) => u.id);

    // Desactivar usuarios (Soft delete: isActive: false)
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: { in: validUserIds } },
        data: { isActive: false },
      });
    });

    // Auditoría
    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: AuditAction.USER_DEACTIVATED,
      entityType: "USER",
      newData: {
        bulkCount: validUserIds.length,
        deactivatedUserIds: validUserIds,
        reason: reason || "Baja masiva desde panel administrativo",
        executedBy: session.user.email,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Se dieron de baja ${validUserIds.length} colaboradores exitosamente`,
      count: validUserIds.length,
    });
  } catch (error: any) {
    console.error("Error en bulk deactivate:", error);
    return NextResponse.json({ error: "Error interno al desactivar en masa" }, { status: 500 });
  }
}
