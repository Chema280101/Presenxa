import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/audit";
import { notifySupervisorsInOrg } from "@/lib/notifications";
import { prisma, TimeOffType, RequestStatus } from "@asistencias/db";
import { z } from "zod";

const CreateTimeOffSchema = z.object({
  userId: z.string().uuid().optional(),
  type: z.nativeEnum(TimeOffType, { errorMap: () => ({ message: "Tipo de permiso inválido" }) }),
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().min(1, "Fecha de fin requerida"),
  reason: z.string().optional().nullable(),
  documentUrl: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const organizationId = (session.user as any).organizationId;
    const userRole = (session.user as any).role;
    if (!organizationId) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const departmentId = searchParams.get("departmentId");
    const search = searchParams.get("search")?.trim() || "";
    const hasPagination = searchParams.has("page");
    const parsedPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const parsedPageSize = Number.parseInt(searchParams.get("pageSize") || "10", 10);
    const pageSize = Number.isNaN(parsedPageSize)
      ? 10
      : Math.min(100, Math.max(10, parsedPageSize));

    const baseWhere: any = {
      organizationId,
    };

    // Si es EMPLEADO, solo ve sus propias solicitudes
    if (userRole === "EMPLEADO") {
      baseWhere.userId = session.user.id;
    }

    const whereClause: any = { ...baseWhere };

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (type && type !== "ALL") {
      whereClause.type = type;
    }

    if (departmentId && departmentId !== "ALL") {
      whereClause.user = {
        ...(whereClause.user || {}),
        departmentId,
      };
    }

    if (search) {
      whereClause.user = {
        ...(whereClause.user || {}),
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { department: { name: { contains: search, mode: "insensitive" } } },
        ],
      };
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);

    const [requests, total, pendingCount, approvedCount, rejectedCount, activeTodayCount] =
      await Promise.all([
        prisma.timeOffRequest.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                photoUrl: true,
                department: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: hasPagination ? (page - 1) * pageSize : undefined,
          take: hasPagination ? pageSize : undefined,
        }),
        hasPagination ? prisma.timeOffRequest.count({ where: whereClause }) : Promise.resolve(0),
        hasPagination
          ? prisma.timeOffRequest.count({ where: { ...baseWhere, status: RequestStatus.PENDING } })
          : Promise.resolve(0),
        hasPagination
          ? prisma.timeOffRequest.count({ where: { ...baseWhere, status: RequestStatus.APPROVED } })
          : Promise.resolve(0),
        hasPagination
          ? prisma.timeOffRequest.count({ where: { ...baseWhere, status: RequestStatus.REJECTED } })
          : Promise.resolve(0),
        hasPagination
          ? prisma.timeOffRequest.count({
              where: {
                ...baseWhere,
                status: RequestStatus.APPROVED,
                startDate: { lte: todayEnd },
                endDate: { gte: todayStart },
              },
            })
          : Promise.resolve(0),
      ]);

    if (hasPagination) {
      return NextResponse.json({
        requests,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
        metrics: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          activeToday: activeTodayCount,
        },
      });
    }

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error("[TimeOff API] Error fetching requests:", error);
    return NextResponse.json({ error: "Error al obtener solicitudes de ausencia" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const organizationId = (session.user as any).organizationId;
    const userRole = (session.user as any).role;
    
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
    }

    const parsed = CreateTimeOffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { userId, type, startDate, endDate, reason, documentUrl } = parsed.data;

    // Si es EMPLEADO, siempre debe solicitar para sí mismo
    let targetUserId = session.user.id;
    if (userId && ["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(userRole)) {
      targetUserId = userId;
    }

    // Verificar que targetUserId pertenezca a la organización
    const targetUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        organizationId,
      },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "El colaborador no pertenece a tu organización" }, { status: 404 });
    }

    const parsedStartDate = new Date(`${startDate}T12:00:00Z`);
    const parsedEndDate = new Date(`${endDate}T12:00:00Z`);

    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      return NextResponse.json({ error: "Formato de fechas inválido" }, { status: 400 });
    }

    if (parsedStartDate > parsedEndDate) {
      return NextResponse.json({ error: "La fecha de inicio no puede ser posterior a la fecha de fin" }, { status: 400 });
    }

    const request = await prisma.timeOffRequest.create({
      data: {
        userId: targetUserId,
        organizationId,
        type,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        reason: reason?.trim() || null,
        documentUrl: documentUrl || null,
        status: RequestStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    await logAuditEvent({
      organizationId,
      userId: session.user.id,
      action: "TIME_OFF_REQUESTED",
      entityType: "TIME_OFF_REQUEST",
      entityId: request.id,
      newData: {
        targetUserId,
        userName: `${request.user.firstName} ${request.user.lastName}`.trim(),
        type: request.type,
        startDate,
        endDate,
        status: request.status,
      },
      req,
    });

    const requesterName = `${request.user.firstName} ${request.user.lastName}`.trim();
    const typeLabel = request.type.replace(/_/g, " ").toLowerCase();
    await notifySupervisorsInOrg({
      organizationId,
      type: "CAMBIO_SEDE_HORARIO",
      title: `Nueva solicitud de ${typeLabel}`,
      body: `${requesterName} envió una solicitud (${startDate} al ${endDate}) pendiente de revisión.`,
      url: "/ausencias",
      tag: `timeoff-req-${request.id}`,
      data: {
        category: "TIME_OFF_REQUEST",
        timeOffRequestId: request.id,
        userId: targetUserId,
      },
    });

    return NextResponse.json({ success: true, request }, { status: 201 });
  } catch (error: any) {
    console.error("[TimeOff API] Error creating request:", error);
    return NextResponse.json({ error: "Error al registrar solicitud de ausencia" }, { status: 500 });
  }
}
