import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { AttendanceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { getLocalTodayDate } from "@/lib/dateUtils";

// GET /api/attendance
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const status = searchParams.get("status") as AttendanceStatus | null;
  const locationId = searchParams.get("locationId");
  const search = searchParams.get("search") || "";

  const where: any = {};

  if (orgId) {
    where.user = {
      organizationId: orgId,
    };
  }

  // Date filtering (@db.Date compatibility)
  if (startDateParam && endDateParam) {
    const sDate = startDateParam.includes("T") ? startDateParam.split("T")[0] : startDateParam;
    const eDate = endDateParam.includes("T") ? endDateParam.split("T")[0] : endDateParam;
    where.date = {
      gte: new Date(`${sDate}T00:00:00.000Z`),
      lte: new Date(`${eDate}T00:00:00.000Z`),
    };
  } else if (dateParam) {
    const cleanDate = dateParam.includes("T") ? dateParam.split("T")[0] : dateParam;
    where.date = new Date(`${cleanDate}T00:00:00.000Z`);
  } else {
    // Default to today in local timezone
    const today = getLocalTodayDate(new Date());
    where.date = today;
  }

  // Status filtering
  if (status && Object.values(AttendanceStatus).includes(status)) {
    where.status = status;
  }

  // Location filtering
  if (locationId) {
    where.locationId = locationId;
  }

  // Search filtering
  if (search) {
    where.user = {
      ...(where.user || {}),
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { documentId: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  try {
    const attendances = await prisma.attendance.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photoUrl: true,
            documentId: true,
            role: true,
            userSchedules: {
              where: {
                OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
              },
              include: {
                schedule: true,
              },
              take: 1,
            },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        kiosk: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const formattedAttendances = attendances;

    // Summary statistics for the filtered date
    const summary = {
      total: attendances.length,
      present: attendances.filter(
        (a) => a.status === AttendanceStatus.PRESENTE
      ).length,
      late: attendances.filter((a) => a.status === AttendanceStatus.TARDE).length,
      absent: attendances.filter((a) => a.status === AttendanceStatus.AUSENTE).length,
      abandoned: attendances.filter(
        (a) => a.status === AttendanceStatus.ABANDONO_PUESTO
      ).length,
      incomplete: attendances.filter(
        (a) => a.status === AttendanceStatus.INCOMPLETO
      ).length,
      pending: attendances.filter(
        (a) => a.status === AttendanceStatus.PENDIENTE
      ).length,
      justified: attendances.filter(
        (a) => a.status === AttendanceStatus.JUSTIFICADO || a.status === AttendanceStatus.PERMISO
      ).length,
    };

    return NextResponse.json({ attendances: formattedAttendances, summary });
  } catch (error: any) {
    console.error("Error al obtener asistencias:", error);
    return NextResponse.json(
      { error: error?.message || "Error al obtener asistencias" },
      { status: 500 }
    );
  }
}
