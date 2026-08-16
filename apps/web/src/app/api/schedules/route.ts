import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const ScheduleSchema = z.object({
  name: z.string().min(1, "El nombre del horario es obligatorio"),
  workdaysMask: z.number().int().min(1).max(127).default(31),
  entryHour: z.number().int().min(0).max(23),
  entryMinute: z.number().int().min(0).max(59),
  exitHour: z.number().int().min(0).max(23),
  exitMinute: z.number().int().min(0).max(59),
  toleranceMinutes: z.number().int().min(0).max(120).default(5),
});

// GET /api/schedules
export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const schedules = await prisma.schedule.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            userSchedules: {
              where: {
                OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ schedules });
  } catch (error: any) {
    console.error("Error al obtener horarios:", error);
    return NextResponse.json({ error: "Error al obtener horarios" }, { status: 500 });
  }
}

// POST /api/schedules
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = ScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const schedule = await prisma.schedule.create({
      data: {
        organizationId: session.user.organizationId,
        name: data.name,
        workdaysMask: data.workdaysMask,
        entryHour: data.entryHour,
        entryMinute: data.entryMinute,
        exitHour: data.exitHour,
        exitMinute: data.exitMinute,
        toleranceMinutes: data.toleranceMinutes,
        isActive: true,
      },
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear horario:", error);
    return NextResponse.json({ error: "Error al crear horario" }, { status: 500 });
  }
}
