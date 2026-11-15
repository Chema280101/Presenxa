import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/audit";
import { parsePaginationParams, buildPaginationMeta } from "@/lib/pagination";
import { prisma } from "@asistencias/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const { hasPagination, page, pageSize, skip, take } = parsePaginationParams(
      searchParams,
      25
    );

    const where = { userId: session.user.id };
    const [requests, total] = await Promise.all([
      prisma.timeOffRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      hasPagination ? prisma.timeOffRequest.count({ where }) : Promise.resolve(0),
    ]);

    if (hasPagination) {
      return NextResponse.json({
        requests,
        pagination: buildPaginationMeta(page, pageSize, total),
      });
    }

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("[UserTimeOff GET] Error:", error);
    return NextResponse.json({ error: "Error al cargar solicitudes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { type, startDate, endDate, reason, documentUrl } = await req.json();

    if (!startDate || !endDate || !type) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const userId = session.user.id;
    const orgId = (session.user as any).organizationId;

    const request = await prisma.timeOffRequest.create({
      data: {
        userId,
        organizationId: orgId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || null,
        documentUrl: documentUrl || null,
        status: "PENDING",
      }
    });

    await logAuditEvent({
      organizationId: orgId || null,
      userId,
      action: "TIME_OFF_REQUESTED",
      entityType: "TIME_OFF_REQUEST",
      entityId: request.id,
      newData: {
        type: request.type,
        startDate,
        endDate,
        status: request.status,
      },
      req,
    });

    return NextResponse.json({ success: true, data: request });
  } catch (error: any) {
    console.error("[TimeOffRequest] Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
