import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { startOfDay, endOfDay, parseISO } from "date-fns";

// GET /api/schedules/matrix
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");
  const locationId = searchParams.get("locationId");
  const departmentId = searchParams.get("departmentId");

  if (!startDateStr || !endDateStr) {
    return NextResponse.json({ error: "startDate y endDate son requeridos" }, { status: 400 });
  }

  try {
    const startDate = startOfDay(parseISO(startDateStr));
    const endDate = endOfDay(parseISO(endDateStr));

    const whereUser: any = {
      organizationId: session.user.organizationId,
      isActive: true,
    };

    if (locationId && locationId !== "ALL") {
      whereUser.locationId = locationId === "GLOBAL" ? null : locationId;
    }

    if (departmentId && departmentId !== "ALL") {
      whereUser.departmentId = departmentId;
    }

    const users = await prisma.user.findMany({
      where: whereUser,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        location: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        userSchedules: {
          where: {
            OR: [
              { validUntil: null },
              { validUntil: { gte: startDate } }
            ]
          },
          include: {
            schedule: {
              select: {
                id: true,
                name: true,
                workdaysMask: true,
                entryHour: true,
                entryMinute: true,
                exitHour: true,
                exitMinute: true,
                isSplit: true,
                entryHour2: true,
                entryMinute2: true,
                exitHour2: true,
                exitMinute2: true,
              }
            }
          }
        },
        shiftOverrides: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            }
          },
          include: {
            schedule: {
              select: {
                id: true,
                name: true,
                entryHour: true,
                entryMinute: true,
                exitHour: true,
                exitMinute: true,
                isSplit: true,
                entryHour2: true,
                entryMinute2: true,
                exitHour2: true,
                exitMinute2: true,
              }
            }
          }
        }
      },
      orderBy: { firstName: "asc" }
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Error al obtener matriz:", error);
    return NextResponse.json({ error: "Error al obtener datos de matriz" }, { status: 500 });
  }
}

const UpdateMatrixSchema = z.object({
  userId: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  scheduleId: z.string().uuid(),
});

// POST /api/schedules/matrix (crear o actualizar ShiftOverride)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateMatrixSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.format() }, { status: 400 });
    }

    const { userId, date, scheduleId } = parsed.data;
    const targetDate = startOfDay(parseISO(date));

    // Validate if schedule belongs to org
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        organizationId: session.user.organizationId,
        isActive: true,
      }
    });

    if (!schedule) {
      return NextResponse.json({ error: "Horario inválido o no encontrado" }, { status: 404 });
    }

    // Upsert shift override
    const override = await prisma.shiftOverride.upsert({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        }
      },
      update: {
        scheduleId,
      },
      create: {
        userId,
        date: targetDate,
        scheduleId,
      },
      include: {
        schedule: {
          select: {
            id: true,
            name: true,
            entryHour: true,
            entryMinute: true,
            exitHour: true,
            exitMinute: true,
            isSplit: true,
            entryHour2: true,
            entryMinute2: true,
            exitHour2: true,
            exitMinute2: true,
          }
        }
      }
    });

    return NextResponse.json({ success: true, override });
  } catch (error: any) {
    console.error("Error al actualizar override:", error);
    return NextResponse.json({ error: "Error al guardar el turno" }, { status: 500 });
  }
}

// DELETE /api/schedules/matrix (eliminar ShiftOverride)
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const dateStr = searchParams.get("date");

  if (!userId || !dateStr) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  try {
    const targetDate = startOfDay(parseISO(dateStr));

    await prisma.shiftOverride.delete({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Si no existe, no es un error crítico
    if (error.code === 'P2025') {
       return NextResponse.json({ success: true });
    }
    console.error("Error al eliminar override:", error);
    return NextResponse.json({ error: "Error al restablecer turno" }, { status: 500 });
  }
}
