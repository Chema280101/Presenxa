import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@asistencias/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = session.user.role;
  const orgId = session.user.organizationId;
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);

  try {
    let whereClause: any = { userId: session.user.id };

    // Si es ADMIN o SUPERVISOR, mostrar notificaciones de los usuarios de su organización si está definida
    if ((role === "ADMIN" || role === "SUPER_ADMIN" || role === "SUPERVISOR") && orgId) {
      whereClause = {
        user: {
          organizationId: orgId,
        },
      };
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              photoUrl: true,
            },
          },
        },
      }),
      prisma.notification.count({
        where: {
          ...whereClause,
          readAt: null,
        },
      }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error("Error al obtener notificaciones:", error);
    return NextResponse.json(
      { error: error?.message || "Error al cargar notificaciones" },
      { status: 500 }
    );
  }
}

export async function PATCH() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = session.user.role;
  const orgId = session.user.organizationId;

  try {
    let whereClause: any = { userId: session.user.id, readAt: null };

    if ((role === "ADMIN" || role === "SUPER_ADMIN" || role === "SUPERVISOR") && orgId) {
      whereClause = {
        user: { organizationId: orgId },
        readAt: null,
      };
    }

    const updated = await prisma.notification.updateMany({
      where: whereClause,
      data: { readAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      markedCount: updated.count,
    });
  } catch (error: any) {
    console.error("Error al marcar notificaciones como leídas:", error);
    return NextResponse.json(
      { error: "Error al actualizar estado de lectura" },
      { status: 500 }
    );
  }
}
