import { auth } from "@/auth";
import { prisma, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    return NextResponse.json(
      { error: "No tienes permisos para ver los logs de auditoría" },
      { status: 403 }
    );
  }

  const organizationId = session.user.organizationId;
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") as AuditAction | null;
  const entityType = searchParams.get("entityType");
  const search = searchParams.get("search")?.trim() || "";

  const parsedPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  const parsedPageSize = Number.parseInt(searchParams.get("pageSize") || "25", 10);
  const pageSize = Number.isNaN(parsedPageSize)
    ? 25
    : Math.min(100, Math.max(10, parsedPageSize));

  const where: any = {
    organizationId,
  };

  if (action && Object.values(AuditAction).includes(action as any)) {
    where.action = action;
  }
  if (entityType && entityType !== "ALL") {
    where.entityType = entityType;
  }

  if (search) {
    where.OR = [
      { entityId: { contains: search, mode: "insensitive" } },
      { entityType: { contains: search, mode: "insensitive" } },
      {
        user: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { documentId: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  try {
    const [
      total,
      logs,
      totalOrgEvents,
      manualEditsCount,
      justificationsCount,
      systemJobsCount,
    ] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, photoUrl: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where: { organizationId } }),
      prisma.auditLog.count({
        where: {
          organizationId,
          action: { in: ["ATTENDANCE_EDITED_MANUAL", "USER_UPDATED", "ENTITY_UPDATED"] },
        },
      }),
      prisma.auditLog.count({
        where: {
          organizationId,
          action: "ATTENDANCE_JUSTIFIED",
        },
      }),
      prisma.auditLog.count({
        where: {
          organizationId,
          OR: [{ userId: null }, { action: "JOB_EXECUTED" }],
        },
      }),
    ]);

    const collectIds = (type: string) =>
      Array.from(
        new Set(
          logs
            .filter((l) => l.entityType === type && l.entityId)
            .map((l) => l.entityId as string)
        )
      );

    const userIds = collectIds("USER");
    const attendanceIds = collectIds("ATTENDANCE");
    const locationIds = collectIds("LOCATION");
    const kioskIds = collectIds("KIOSK");
    const scheduleIds = collectIds("SCHEDULE");
    const departmentIds = collectIds("DEPARTMENT");
    const holidayIds = collectIds("HOLIDAY");
    const timeOffIds = collectIds("TIME_OFF_REQUEST");

    const [
      users,
      attendances,
      locations,
      kiosks,
      schedules,
      departments,
      holidays,
      timeOffRequests,
    ] = await Promise.all([
      userIds.length
        ? prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, documentId: true, email: true },
          })
        : Promise.resolve([]),
      attendanceIds.length
        ? prisma.attendance.findMany({
            where: { id: { in: attendanceIds } },
            select: {
              id: true,
              user: {
                select: { id: true, firstName: true, lastName: true, documentId: true, email: true },
              },
            },
          })
        : Promise.resolve([]),
      locationIds.length
        ? prisma.location.findMany({
            where: { id: { in: locationIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      kioskIds.length
        ? prisma.kiosk.findMany({
            where: { id: { in: kioskIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      scheduleIds.length
        ? prisma.schedule.findMany({
            where: { id: { in: scheduleIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      departmentIds.length
        ? prisma.department.findMany({
            where: { id: { in: departmentIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      holidayIds.length
        ? prisma.holiday.findMany({
            where: { id: { in: holidayIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      timeOffIds.length
        ? prisma.timeOffRequest.findMany({
            where: { id: { in: timeOffIds } },
            select: {
              id: true,
              type: true,
              user: { select: { firstName: true, lastName: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const attendanceMap = new Map(attendances.map((a) => [a.id, a]));
    const locationMap = new Map(locations.map((l) => [l.id, l]));
    const kioskMap = new Map(kiosks.map((k) => [k.id, k]));
    const scheduleMap = new Map(schedules.map((s) => [s.id, s]));
    const departmentMap = new Map(departments.map((d) => [d.id, d]));
    const holidayMap = new Map(holidays.map((h) => [h.id, h]));
    const timeOffMap = new Map(timeOffRequests.map((t) => [t.id, t]));

    const enrichedLogs = logs.map((log) => {
      let targetName: string | null = null;
      let targetDetail: string | null = null;
      const snapshot = (log.newData || log.oldData) as any;

      if (log.entityType === "USER" && log.entityId) {
        const u = userMap.get(log.entityId);
        if (u) {
          targetName = `${u.firstName} ${u.lastName}`.trim();
          targetDetail = u.documentId ? `DNI: ${u.documentId}` : u.email;
        } else if (snapshot?.firstName) {
          targetName = `${snapshot.firstName} ${snapshot.lastName || ""}`.trim();
          targetDetail =
            snapshot.documentId || snapshot.dni
              ? `DNI: ${snapshot.documentId || snapshot.dni}`
              : snapshot.email || null;
        }
      } else if (log.entityType === "ATTENDANCE" && log.entityId) {
        const a = attendanceMap.get(log.entityId);
        if (a?.user) {
          targetName = `${a.user.firstName} ${a.user.lastName}`.trim();
          targetDetail = a.user.documentId ? `DNI: ${a.user.documentId}` : a.user.email;
        } else if (snapshot?.userName) {
          targetName = snapshot.userName;
        } else if (snapshot?.firstName) {
          targetName = `${snapshot.firstName} ${snapshot.lastName || ""}`.trim();
        }
      } else if (log.entityType === "LOCATION" && log.entityId) {
        const loc = locationMap.get(log.entityId);
        targetName = loc?.name || snapshot?.name || null;
        targetDetail = "Sede";
      } else if (log.entityType === "KIOSK" && log.entityId) {
        const k = kioskMap.get(log.entityId);
        targetName = k?.name || snapshot?.name || null;
        targetDetail = "Dispositivo Kiosko";
      } else if (log.entityType === "SCHEDULE" && log.entityId) {
        const s = scheduleMap.get(log.entityId);
        targetName = s?.name || snapshot?.name || snapshot?.scheduleName || null;
        targetDetail = "Horario";
      } else if (log.entityType === "DEPARTMENT" && log.entityId) {
        const d = departmentMap.get(log.entityId);
        targetName = d?.name || snapshot?.name || null;
        targetDetail = "Departamento";
      } else if (log.entityType === "HOLIDAY" && log.entityId) {
        const h = holidayMap.get(log.entityId);
        targetName = h?.name || snapshot?.name || null;
        targetDetail = "Feriado";
      } else if (log.entityType === "ORGANIZATION") {
        targetName = snapshot?.name || "Organización";
        targetDetail = "Configuración General";
      } else if (log.entityType === "TIME_OFF_REQUEST" && log.entityId) {
        const t = timeOffMap.get(log.entityId);
        if (t?.user) {
          targetName = `${t.user.firstName} ${t.user.lastName}`.trim();
          targetDetail = t.type;
        } else if (snapshot?.userName) {
          targetName = snapshot.userName;
          targetDetail = snapshot.type || "Permiso / Ausencia";
        }
      }

      return {
        ...log,
        targetName,
        targetDetail,
      };
    });

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
      metrics: {
        total: totalOrgEvents,
        manualEdits: manualEditsCount,
        justifications: justificationsCount,
        systemJobs: systemJobsCount,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener logs de auditoría:", error);
    return NextResponse.json({ error: "Error al obtener logs" }, { status: 500 });
  }
}
