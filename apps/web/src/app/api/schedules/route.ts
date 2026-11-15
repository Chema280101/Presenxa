import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/audit";
import { parsePaginationParams, buildPaginationMeta } from "@/lib/pagination";
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
  isSplit: z.boolean().default(false),
  entryHour2: z.number().int().min(0).max(23).optional().nullable(),
  entryMinute2: z.number().int().min(0).max(59).optional().nullable(),
  exitHour2: z.number().int().min(0).max(23).optional().nullable(),
  exitMinute2: z.number().int().min(0).max(59).optional().nullable(),
  toleranceMinutes2: z.number().int().min(0).max(120).optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  isTemplate: z.boolean().default(false),
});

// GET /api/schedules
export async function GET(req: Request) {
  const session = await auth();
  const url = new URL(req.url);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const isTemplate = url.searchParams.get("templates") === "true";
    const search = url.searchParams.get("search")?.trim() || "";
    const statusFilter = url.searchParams.get("status");
    const { hasPagination, page, pageSize, skip, take } = parsePaginationParams(
      url.searchParams,
      25
    );

    const where: any = {
      organizationId: session.user.organizationId,
      isTemplate,
    };
    if (statusFilter === "ACTIVE") where.isActive = true;
    if (statusFilter === "INACTIVE") where.isActive = false;
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [schedules, total] = await Promise.all([
      prisma.schedule.findMany({
        where,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        skip,
        take,
        include: {
          location: {
            select: {
              id: true,
              name: true,
            },
          },
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
      }),
      hasPagination ? prisma.schedule.count({ where }) : Promise.resolve(0),
    ]);

    if (hasPagination) {
      return NextResponse.json({
        schedules,
        pagination: buildPaginationMeta(page, pageSize, total),
      });
    }

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
        isSplit: data.isSplit,
        entryHour2: data.isSplit ? data.entryHour2 : null,
        entryMinute2: data.isSplit ? data.entryMinute2 : null,
        exitHour2: data.isSplit ? data.exitHour2 : null,
        exitMinute2: data.isSplit ? data.exitMinute2 : null,
        toleranceMinutes2: data.isSplit ? (data.toleranceMinutes2 ?? data.toleranceMinutes) : null,
        locationId: data.locationId,
        isTemplate: data.isTemplate,
        isActive: true,
      },
    });

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "ENTITY_CREATED",
      entityType: "SCHEDULE",
      entityId: schedule.id,
      newData: {
        name: schedule.name,
        entryHour: schedule.entryHour,
        entryMinute: schedule.entryMinute,
        exitHour: schedule.exitHour,
        exitMinute: schedule.exitMinute,
        isSplit: schedule.isSplit,
      },
      req,
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear horario:", error);
    return NextResponse.json({ error: "Error al crear horario" }, { status: 500 });
  }
}
