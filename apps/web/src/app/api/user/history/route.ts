import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { format, subDays } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const thirtyDaysAgo = subDays(new Date(), 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const attendances = await prisma.attendance.findMany({
      where: {
        userId: session.user.id,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "desc" },
      include: {
        location: {
          select: { name: true },
        },
      },
    });

    const totalDays = attendances.length;
    const presents = attendances.filter(
      (a: { status: string }) => a.status === "PRESENTE" || a.status === "TARDE"
    ).length;
    const onTime = attendances.filter(
      (a: { status: string }) => a.status === "PRESENTE"
    ).length;
    const lates = attendances.filter(
      (a: { status: string }) => a.status === "TARDE"
    ).length;
    const absences = attendances.filter(
      (a: { status: string }) => a.status === "AUSENTE" || a.status === "ABANDONO_PUESTO"
    ).length;

    const punctualityRate = presents > 0 ? Math.round((onTime / presents) * 100) : 100;
    const totalMinutesWorked = attendances.reduce(
      (acc: number, a: { workedMinutes: number | null }) => acc + (a.workedMinutes || 0),
      0
    );

    return NextResponse.json({
      metrics: {
        totalDays,
        presents,
        onTime,
        lates,
        absences,
        punctualityRate,
        totalHoursWorked: Math.round((totalMinutesWorked / 60) * 10) / 10,
      },
      history: attendances.map((a: any) => ({
        id: a.id,
        date: format(a.date, "yyyy-MM-dd"),
        entryTime: a.entryTime ? format(a.entryTime, "HH:mm:ss") : null,
        exitTime: a.exitTime ? format(a.exitTime, "HH:mm:ss") : null,
        status: a.status,
        lateMinutes: a.lateMinutes,
        workedMinutes: a.workedMinutes,
        locationName: a.location?.name || "Sin sede",
        notes: a.notes,
      })),
    });
  } catch (error) {
    console.error("Error al obtener historial del usuario:", error);
    return NextResponse.json(
      { error: "Error al consultar historial de asistencia" },
      { status: 500 }
    );
  }
}
