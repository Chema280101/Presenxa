import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const AssignBulkSchema = z.object({
  scheduleId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1, "Debe seleccionar al menos un colaborador"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = AssignBulkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { scheduleId, userIds } = parsed.data;

    // Verify schedule belongs to the organization
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        organizationId: session.user.organizationId,
        isActive: true,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: "Horario no encontrado o inactivo" }, { status: 404 });
    }

    // Verify all users belong to the organization
    const validUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        organizationId: session.user.organizationId,
        isActive: true,
      },
      select: { id: true },
    });

    const validUserIds = validUsers.map((u) => u.id);

    if (validUserIds.length === 0) {
      return NextResponse.json({ error: "No se encontraron colaboradores válidos" }, { status: 400 });
    }

    // Begin transaction to invalidate old schedules and create new ones
    await prisma.$transaction(async (tx) => {
      // End current active schedules for these users
      await tx.userSchedule.updateMany({
        where: {
          userId: { in: validUserIds },
          validUntil: null,
        },
        data: {
          validUntil: new Date(),
        },
      });

      // Create new schedules
      await tx.userSchedule.createMany({
        data: validUserIds.map((userId) => ({
          userId,
          scheduleId,
          validFrom: new Date(),
        })),
      });
    });

    return NextResponse.json({
      success: true,
      message: `Horario asignado exitosamente a ${validUserIds.length} colaboradores`,
    });
  } catch (error: any) {
    console.error("Error al asignar masivamente:", error);
    return NextResponse.json(
      { error: "Error al asignar horarios a los colaboradores" },
      { status: 500 }
    );
  }
}
