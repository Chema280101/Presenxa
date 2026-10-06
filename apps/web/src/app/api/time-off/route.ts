import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@asistencias/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const organizationId = (session.user as any).organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const whereClause: any = {
      organizationId,
    };

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (type && type !== "ALL") {
      whereClause.type = type;
    }

    const requests = await prisma.timeOffRequest.findMany({
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
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error("[TimeOff API] Error fetching requests:", error);
    return NextResponse.json({ error: "Error al obtener solicitudes de ausencia" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const organizationId = (session.user as any).organizationId;
    const body = await req.json();
    const { userId, type, startDate, endDate, reason, documentUrl } = body;

    const targetUserId = userId || session.user.id;

    if (!targetUserId || !type || !startDate || !endDate) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const request = await prisma.timeOffRequest.create({
      data: {
        userId: targetUserId,
        organizationId,
        type,
        startDate: new Date(`${startDate}T12:00:00Z`),
        endDate: new Date(`${endDate}T12:00:00Z`),
        reason: reason?.trim() || null,
        documentUrl: documentUrl || null,
        status: "PENDING",
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

    // Registrar en auditoría de forma segura
    try {
      const actorUser = session.user?.id
        ? await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true },
          })
        : null;

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId: actorUser?.id || null,
          action: "TIME_OFF_REQUESTED",
          entityType: "TIME_OFF_REQUEST",
          entityId: request.id,
          newData: {
            requestedFor: targetUserId,
            type,
            startDate,
            endDate,
          },
        },
      });
    } catch (auditErr) {
      console.warn("[TimeOff API] Could not create audit log:", auditErr);
    }

    return NextResponse.json({ request }, { status: 201 });
  } catch (error: any) {
    console.error("[TimeOff API] Error creating request:", error);
    return NextResponse.json({ error: "Error al registrar la solicitud" }, { status: 500 });
  }
}
