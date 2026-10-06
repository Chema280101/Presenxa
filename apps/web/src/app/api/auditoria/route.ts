import { auth } from "@/auth";
import { prisma, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as any).role;
  // Solo super admins y admins pueden ver la auditoría
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    return NextResponse.json(
      { error: "No tienes permisos para ver los logs de auditoría" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") as AuditAction | null;
  const entityType = searchParams.get("entityType");

  const where: any = {
    organizationId: session.user.organizationId,
  };

  if (action && Object.values(AuditAction).includes(action as any)) {
    where.action = action;
  }
  if (entityType) {
    where.entityType = entityType;
  }

  try {
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, photoUrl: true },
        },
      },
      take: 200,
    });

    const userEntityIds = logs
      .filter((l) => l.entityType === "USER" && l.entityId)
      .map((l) => l.entityId as string);

    const attendanceEntityIds = logs
      .filter((l) => l.entityType === "ATTENDANCE" && l.entityId)
      .map((l) => l.entityId as string);

    const locationEntityIds = logs
      .filter((l) => l.entityType === "LOCATION" && l.entityId)
      .map((l) => l.entityId as string);

    const kioskEntityIds = logs
      .filter((l) => l.entityType === "KIOSK" && l.entityId)
      .map((l) => l.entityId as string);

    const userMap = new Map<
      string,
      { id: string; firstName: string; lastName: string; documentId: string | null; email: string }
    >();
    if (userEntityIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: userEntityIds } },
        select: { id: true, firstName: true, lastName: true, documentId: true, email: true },
      });
      users.forEach((u) => userMap.set(u.id, u));
    }

    const attendanceMap = new Map<
      string,
      {
        id: string;
        user: { id: string; firstName: string; lastName: string; documentId: string | null; email: string };
      }
    >();
    if (attendanceEntityIds.length > 0) {
      const attendances = await prisma.attendance.findMany({
        where: { id: { in: attendanceEntityIds } },
        select: {
          id: true,
          user: {
            select: { id: true, firstName: true, lastName: true, documentId: true, email: true },
          },
        },
      });
      attendances.forEach((a) => attendanceMap.set(a.id, a));
    }

    const locationMap = new Map<string, { id: string; name: string }>();
    if (locationEntityIds.length > 0) {
      const locations = await prisma.location.findMany({
        where: { id: { in: locationEntityIds } },
        select: { id: true, name: true },
      });
      locations.forEach((l) => locationMap.set(l.id, l));
    }

    const kioskMap = new Map<string, { id: string; name: string }>();
    if (kioskEntityIds.length > 0) {
      const kiosks = await prisma.kiosk.findMany({
        where: { id: { in: kioskEntityIds } },
        select: { id: true, name: true },
      });
      kiosks.forEach((k) => kioskMap.set(k.id, k));
    }

    const enrichedLogs = logs.map((log) => {
      let targetName: string | null = null;
      let targetDetail: string | null = null;

      if (log.entityType === "USER" && log.entityId) {
        const u = userMap.get(log.entityId);
        if (u) {
          targetName = `${u.firstName} ${u.lastName}`.trim();
          targetDetail = u.documentId ? `DNI: ${u.documentId}` : u.email;
        } else {
          const snapshot = (log.newData || log.oldData) as any;
          if (snapshot?.firstName) {
            targetName = `${snapshot.firstName} ${snapshot.lastName || ""}`.trim();
            targetDetail = snapshot.documentId || snapshot.dni ? `DNI: ${snapshot.documentId || snapshot.dni}` : snapshot.email || null;
          }
        }
      } else if (log.entityType === "ATTENDANCE" && log.entityId) {
        const a = attendanceMap.get(log.entityId);
        if (a?.user) {
          targetName = `${a.user.firstName} ${a.user.lastName}`.trim();
          targetDetail = a.user.documentId ? `DNI: ${a.user.documentId}` : a.user.email;
        } else {
          const snapshot = (log.newData || log.oldData) as any;
          if (snapshot?.userName) {
            targetName = snapshot.userName;
          } else if (snapshot?.firstName) {
            targetName = `${snapshot.firstName} ${snapshot.lastName || ""}`.trim();
          }
        }
      } else if (log.entityType === "LOCATION" && log.entityId) {
        const loc = locationMap.get(log.entityId);
        if (loc) {
          targetName = loc.name;
          targetDetail = "Sede";
        }
      } else if (log.entityType === "KIOSK" && log.entityId) {
        const k = kioskMap.get(log.entityId);
        if (k) {
          targetName = k.name;
          targetDetail = "Dispositivo Kiosko";
        }
      }

      return {
        ...log,
        targetName,
        targetDetail,
      };
    });

    return NextResponse.json({ logs: enrichedLogs });
  } catch (error: any) {
    console.error("Error al obtener logs de auditoría:", error);
    return NextResponse.json({ error: "Error al obtener logs" }, { status: 500 });
  }
}
