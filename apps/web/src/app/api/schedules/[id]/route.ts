import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/audit";
import { isOvernightSchedule } from "@/lib/scheduleResolver";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateScheduleSchema = z.object({
  name: z.string().min(1, "El nombre del horario es obligatorio").optional(),
  workdaysMask: z.number().int().min(1).max(127).optional(),
  entryHour: z.number().int().min(0).max(23).optional(),
  entryMinute: z.number().int().min(0).max(59).optional(),
  exitHour: z.number().int().min(0).max(23).optional(),
  exitMinute: z.number().int().min(0).max(59).optional(),
  toleranceMinutes: z.number().int().min(0).max(120).optional(),
  isSplit: z.boolean().optional(),
  entryHour2: z.number().int().min(0).max(23).optional().nullable(),
  entryMinute2: z.number().int().min(0).max(59).optional().nullable(),
  exitHour2: z.number().int().min(0).max(23).optional().nullable(),
  exitMinute2: z.number().int().min(0).max(59).optional().nullable(),
  toleranceMinutes2: z.number().int().min(0).max(120).optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/schedules/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const schedule = await prisma.schedule.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      include: {
        userSchedules: {
          where: {
            OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: "Horario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ schedule });
  } catch (error: any) {
    console.error("Error al obtener horario:", error);
    return NextResponse.json({ error: "Error al obtener horario" }, { status: 500 });
  }
}

// PUT /api/schedules/[id]
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
    const parsed = UpdateScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const existing = await prisma.schedule.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Horario no encontrado" }, { status: 404 });
    }

    const mergedForOvernight = {
      entryHour: parsed.data.entryHour ?? existing.entryHour,
      entryMinute: parsed.data.entryMinute ?? existing.entryMinute,
      exitHour: parsed.data.exitHour ?? existing.exitHour,
      exitMinute: parsed.data.exitMinute ?? existing.exitMinute,
      isSplit: parsed.data.isSplit ?? existing.isSplit,
      exitHour2: parsed.data.exitHour2 !== undefined ? parsed.data.exitHour2 : existing.exitHour2,
      exitMinute2: parsed.data.exitMinute2 !== undefined ? parsed.data.exitMinute2 : existing.exitMinute2,
    };
    const crossesMidnight = isOvernightSchedule(mergedForOvernight);

    const updated = await prisma.schedule.update({
      where: { id },
      data: {
        ...parsed.data,
        crossesMidnight,
      },
    });

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "ENTITY_UPDATED",
      entityType: "SCHEDULE",
      entityId: updated.id,
      oldData: {
        name: existing.name,
        entryHour: existing.entryHour,
        entryMinute: existing.entryMinute,
        exitHour: existing.exitHour,
        exitMinute: existing.exitMinute,
        isActive: existing.isActive,
      },
      newData: {
        name: updated.name,
        entryHour: updated.entryHour,
        entryMinute: updated.entryMinute,
        exitHour: updated.exitHour,
        exitMinute: updated.exitMinute,
        isActive: updated.isActive,
      },
      req,
    });

    return NextResponse.json({ schedule: updated });
  } catch (error: any) {
    console.error("Error al actualizar horario:", error);
    return NextResponse.json({ error: "Error al actualizar horario" }, { status: 500 });
  }
}

// DELETE /api/schedules/[id]
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
    const existing = await prisma.schedule.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Horario no encontrado" }, { status: 404 });
    }

    // Soft-delete
    const schedule = await prisma.schedule.update({
      where: { id },
      data: { isActive: false },
    });

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "ENTITY_DELETED",
      entityType: "SCHEDULE",
      entityId: schedule.id,
      oldData: { name: existing.name, isActive: existing.isActive },
      newData: { name: schedule.name, isActive: schedule.isActive },
      req,
    });

    return NextResponse.json({ message: "Horario desactivado correctamente", schedule });
  } catch (error: any) {
    console.error("Error al desactivar horario:", error);
    return NextResponse.json({ error: "Error al desactivar horario" }, { status: 500 });
  }
}
