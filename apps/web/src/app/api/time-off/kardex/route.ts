import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { differenceInCalendarDays } from "date-fns";
import { z } from "zod";

const UpdateKardexSchema = z.object({
  userId: z.string().uuid(),
  vacationDaysPerYear: z.number().int().min(0).max(60),
  vacationDaysAdjustment: z.number().int().min(-60).max(60),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(role)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${currentYear}-12-31T23:59:59.999Z`);

    const users = await prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        documentId: true,
        hireDate: true,
        vacationDaysPerYear: true,
        vacationDaysAdjustment: true,
        department: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        timeOffRequests: {
          where: {
            type: "VACACIONES",
            status: { in: ["APPROVED", "PENDING"] },
            startDate: { gte: yearStart, lte: yearEnd },
          },
          select: {
            status: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    const kardex = users.map((u) => {
      let daysTaken = 0;
      let pendingDays = 0;

      for (const req of u.timeOffRequests) {
        const span = Math.max(1, differenceInCalendarDays(req.endDate, req.startDate) + 1);
        if (req.status === "APPROVED") {
          daysTaken += span;
        } else if (req.status === "PENDING") {
          pendingDays += span;
        }
      }

      const totalAssigned = u.vacationDaysPerYear + u.vacationDaysAdjustment;
      const availableDays = totalAssigned - daysTaken;

      return {
        userId: u.id,
        fullName: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        documentId: u.documentId,
        departmentName: u.department?.name || "General",
        locationName: u.location?.name || "Sin sede",
        vacationDaysPerYear: u.vacationDaysPerYear,
        vacationDaysAdjustment: u.vacationDaysAdjustment,
        totalAssigned,
        daysTaken,
        pendingDays,
        availableDays,
      };
    });

    return NextResponse.json({ year: currentYear, kardex });
  } catch (error) {
    console.error("[Kardex API] Error:", error);
    return NextResponse.json({ error: "Error al calcular kardex vacacional" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Solo Administradores pueden ajustar saldos" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = UpdateKardexSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { userId, vacationDaysPerYear, vacationDaysAdjustment } = parsed.data;

    const existing = await prisma.user.findFirst({
      where: { id: userId, organizationId: session.user.organizationId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { vacationDaysPerYear, vacationDaysAdjustment },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Kardex PATCH] Error:", error);
    return NextResponse.json({ error: "Error al actualizar saldo vacacional" }, { status: 500 });
  }
}
