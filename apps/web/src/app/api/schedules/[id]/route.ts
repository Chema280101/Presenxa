import { auth } from "@/auth";
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
  isActive: z.boolean().optional(),
});

// GET /api/schedules/[id]
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

    const updated = await prisma.schedule.update({
      where: { id },
      data: parsed.data,
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

    return NextResponse.json({ message: "Horario desactivado correctamente", schedule });
  } catch (error: any) {
    console.error("Error al desactivar horario:", error);
    return NextResponse.json({ error: "Error al desactivar horario" }, { status: 500 });
  }
}
