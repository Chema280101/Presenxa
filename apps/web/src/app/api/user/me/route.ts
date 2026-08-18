import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { format } from "date-fns";
import { generateSignedQrPayload } from "@/lib/qrCrypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
            geofenceLat: true,
            geofenceLng: true,
            geofenceRadius: true,
            geofencePolygon: true,
          },
        },
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
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Buscar la asistencia de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAttendance = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    });

    const activeSchedule = user.userSchedules[0]?.schedule ?? null;
    const signedQrPayload = generateSignedQrPayload(user.id, user.qrToken);

    return NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        documentId: user.documentId,
        photoUrl: user.photoUrl,
        role: user.role,
        qrToken: user.qrToken,
        signedQrPayload,
        qrGeneratedAt: user.qrGeneratedAt,
        organization: user.organization,
        location: user.location,
        schedule: activeSchedule
          ? {
              id: activeSchedule.id,
              name: activeSchedule.name,
              isSplit: Boolean(activeSchedule.isSplit),
              entryTime: `${String(activeSchedule.entryHour).padStart(2, "0")}:${String(
                activeSchedule.entryMinute
              ).padStart(2, "0")}`,
              exitTime: `${String(activeSchedule.exitHour).padStart(2, "0")}:${String(
                activeSchedule.exitMinute
              ).padStart(2, "0")}`,
              entryTime2: activeSchedule.isSplit && activeSchedule.entryHour2 !== null
                ? `${String(activeSchedule.entryHour2).padStart(2, "0")}:${String(
                    activeSchedule.entryMinute2 || 0
                  ).padStart(2, "0")}`
                : null,
              exitTime2: activeSchedule.isSplit && activeSchedule.exitHour2 !== null
                ? `${String(activeSchedule.exitHour2).padStart(2, "0")}:${String(
                    activeSchedule.exitMinute2 || 0
                  ).padStart(2, "0")}`
                : null,
              toleranceMinutes: activeSchedule.toleranceMinutes,
              toleranceMinutes2: activeSchedule.toleranceMinutes2,
              workdaysMask: activeSchedule.workdaysMask,
            }
          : null,
      },
      todayAttendance: todayAttendance
        ? {
            id: todayAttendance.id,
            date: format(todayAttendance.date, "yyyy-MM-dd"),
            entryTime: todayAttendance.entryTime
              ? format(todayAttendance.entryTime, "HH:mm:ss")
              : null,
            exitTime: todayAttendance.exitTime
              ? format(todayAttendance.exitTime, "HH:mm:ss")
              : null,
            entryTime2: todayAttendance.entryTime2
              ? format(todayAttendance.entryTime2, "HH:mm:ss")
              : null,
            exitTime2: todayAttendance.exitTime2
              ? format(todayAttendance.exitTime2, "HH:mm:ss")
              : null,
            status: todayAttendance.status,
            lateMinutes: todayAttendance.lateMinutes,
            lateMinutes2: todayAttendance.lateMinutes2,
            workedMinutes: todayAttendance.workedMinutes,
            notes: todayAttendance.notes,
          }
        : null,
    });
  } catch (error) {
    console.error("Error al obtener perfil del usuario:", error);
    return NextResponse.json(
      { error: "Error al consultar los datos del usuario" },
      { status: 500 }
    );
  }
}
