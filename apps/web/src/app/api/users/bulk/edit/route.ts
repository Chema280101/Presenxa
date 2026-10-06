import { auth } from "@/auth";
import { prisma, UserRole, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";

const BulkEditSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, "Debe seleccionar al menos un usuario"),
  data: z.object({
    locationId: z.string().uuid().nullable().optional(),
    role: z.nativeEnum(UserRole).optional(),
    scheduleId: z.string().uuid().nullable().optional(),
  }).refine((data) => {
    return data.locationId !== undefined || data.role !== undefined || data.scheduleId !== undefined;
  }, {
    message: "Debe especificar al menos un campo para actualizar",
  }),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRole = (session.user as any).role;
  const supervisorLocationId = (session.user as any).locationId;

  if (userRole === "EMPLEADO") {
    return NextResponse.json(
      { error: "No tienes permiso para realizar modificaciones masivas" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = BulkEditSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { userIds, data } = parsed.data;

    // Verificar que todos los usuarios pertenezcan a la organización
    const targetUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        organizationId: session.user.organizationId,
        ...(userRole === "SUPERVISOR" && supervisorLocationId ? { locationId: supervisorLocationId } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        locationId: true,
      },
    });

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron usuarios válidos para actualizar" },
        { status: 404 }
      );
    }

    const validUserIds = targetUsers.map((u) => u.id);

    // Preparar objeto de actualización de User
    const userUpdateData: { locationId?: string | null; role?: UserRole } = {};
    if (data.locationId !== undefined) {
      userUpdateData.locationId = data.locationId;
    }
    if (data.role !== undefined) {
      // Supervisor no puede promover usuarios a ADMIN
      if (userRole === "SUPERVISOR" && data.role === UserRole.ADMIN) {
        return NextResponse.json(
          { error: "Un supervisor no puede asignar el rol Administrador" },
          { status: 403 }
        );
      }
      userUpdateData.role = data.role;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Actualizar campos directos del usuario si hay alguno
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.updateMany({
          where: { id: { in: validUserIds } },
          data: userUpdateData,
        });
      }

      // 2. Si se especificó un nuevo horario
      if (data.scheduleId !== undefined) {
        const now = new Date();
        // Cerrar horarios activos previos
        await tx.userSchedule.updateMany({
          where: {
            userId: { in: validUserIds },
            OR: [{ validUntil: null }, { validUntil: { gt: now } }],
          },
          data: {
            validUntil: now,
          },
        });

        // Asignar el nuevo horario a cada usuario si scheduleId no es null
        if (data.scheduleId) {
          const newSchedules = validUserIds.map((userId) => ({
            userId,
            scheduleId: data.scheduleId as string,
            validFrom: now,
          }));
          await tx.userSchedule.createMany({
            data: newSchedules,
          });
        }
      }
    });

    // Auditoría
    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: AuditAction.USER_UPDATED,
      entityType: "USER",
      newData: {
        bulkCount: validUserIds.length,
        updatedFields: data,
        updatedUserIds: validUserIds,
        executedBy: session.user.email,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Se actualizaron ${validUserIds.length} colaboradores exitosamente`,
      count: validUserIds.length,
    });
  } catch (error: any) {
    console.error("Error en bulk edit:", error);
    return NextResponse.json({ error: "Error interno al actualizar en masa" }, { status: 500 });
  }
}
