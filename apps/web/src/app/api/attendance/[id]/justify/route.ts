import { auth } from "@/auth";
import { prisma, AttendanceStatus, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { differenceInMinutes } from "date-fns";
import { logAuditEvent } from "@/lib/audit";

function parseTimeString(timeVal: string | null | undefined, baseDate: Date): Date | null {
  if (!timeVal) return null;
  if (timeVal.includes("T") || timeVal.includes("-")) {
    const d = new Date(timeVal);
    return isNaN(d.getTime()) ? null : d;
  }
  const [hStr, mStr] = timeVal.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

const JustifySchema = z.object({
  reason: z.string().min(1, "El motivo de la justificación es obligatorio"),
  category: z.string().optional().nullable(),
  categoryLabel: z.string().optional().nullable(),
  exitTime: z.string().optional().nullable(),
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

    const { reason, status, categoryLabel, exitTime } = parsed.data;

    const existing = await prisma.attendance.findFirst({
      where: {
        id,
        user: { organizationId: session.user.organizationId },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Registro de asistencia no encontrado" },
        { status: 404 }
      );
    }

    // Evitar anidamiento recursivo si ya existía una justificación previa
    let basePreviousNotes = existing.notes || "";
    if (basePreviousNotes.startsWith("[JUSTIFICACIÓN")) {
      const prevMatch = basePreviousNotes.match(/\(Notas previas:\s*([\s\S]*?)\)$/);
      basePreviousNotes = prevMatch ? prevMatch[1].trim() : "";
    }

    const catLabel = categoryLabel?.trim();
    const notePrefix = catLabel ? `[JUSTIFICACIÓN - Tipo: ${catLabel}]: ` : `[JUSTIFICACIÓN]: `;
    const updatedNotes = `${notePrefix}${reason}${
      basePreviousNotes ? `\n(Notas previas: ${basePreviousNotes})` : ""
    }`;

    const updateData: any = {
      status,
      notes: updatedNotes,
      statusChangedAt: new Date(),
      statusChangedBy: session.user.name || session.user.email || "ADMIN",
    };

    // Si se envía regularización de hora de salida (útil para INCOMPLETO / sin salida)
    if (exitTime) {
      const parsedExit = parseTimeString(exitTime, existing.date);
      if (parsedExit) {
        updateData.exitTime = parsedExit;
        if (existing.entryTime) {
          updateData.workedMinutes = Math.max(0, differenceInMinutes(parsedExit, existing.entryTime));
        }
      }
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    try {
      await logAuditEvent({
        organizationId: session.user.organizationId,
        userId: session.user.id || null,
        action: AuditAction.ATTENDANCE_JUSTIFIED,
        entityType: "ATTENDANCE",
        entityId: id,
        oldData: {
          status: existing.status,
        },
        newData: {
          status,
          categoryLabel: catLabel || null,
          regularizedExitTime: exitTime || null,
          reason,
        },
        req,
      });
    } catch (auditErr) {
      console.warn("No se pudo registrar log de auditoría:", auditErr);
    }

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
