import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { AttendanceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const JustifySchema = z.object({
  reason: z.string().min(1, "El motivo de la justificación es obligatorio"),
  status: z
    .enum([AttendanceStatus.JUSTIFICADO, AttendanceStatus.PERMISO])
    .default(AttendanceStatus.JUSTIFICADO),
});

// POST /api/attendance/[id]/justify
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = JustifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { reason, status } = parsed.data;

    const existing = await prisma.attendance.findFirst({
      where: {
        id,
        user: { organizationId: session.user.organizationId },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Registro de asistencia no encontrado" },
        { status: 404 }
      );
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        status,
        notes: `[JUSTIFICACIÓN]: ${reason}${
          existing.notes ? `\n(Notas previas: ${existing.notes})` : ""
        }`,
        statusChangedAt: new Date(),
        statusChangedBy: session.user.name || session.user.email || "ADMIN",
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json({
      message: "Asistencia justificada correctamente",
      attendance: updated,
    });
  } catch (error: any) {
    console.error("Error al justificar asistencia:", error);
    return NextResponse.json(
      { error: "Error al justificar asistencia" },
      { status: 500 }
    );
  }
}
