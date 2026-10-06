import { auth } from "@/auth";
import { prisma, AttendanceStatus, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";

import { differenceInMinutes } from "date-fns";

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

const PatchAttendanceSchema = z.object({
  status: z.nativeEnum(AttendanceStatus).optional(),
  entryTime: z.string().optional().nullable(),
  exitTime: z.string().optional().nullable(),
  entryTime2: z.string().optional().nullable(),
  exitTime2: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lateMinutes: z.number().int().min(0).optional().nullable(),
  lateMinutes2: z.number().int().min(0).optional().nullable(),
  workedMinutes: z.number().int().min(0).optional().nullable(),
});

// GET /api/attendance/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const attendance = await prisma.attendance.findFirst({
    where: {
      id,
      user: { organizationId: session.user.organizationId },
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, documentId: true },
      },
      location: {
        select: { id: true, name: true },
      },
    },
  });

  if (!attendance) {
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ attendance });
}

// PATCH /api/attendance/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const supervisorLocationId = (session.user as any).locationId;
  const { id } = await params;

  if (role === "EMPLEADO") {
    return NextResponse.json(
      { error: "No tienes permiso para modificar registros de asistencia" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = PatchAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Multi-tenant & RBAC: Verify attendance belongs to this organization and supervisor's location
    const whereCondition: any = {
      id,
      user: { organizationId: session.user.organizationId },
    };

    if (role === "SUPERVISOR" && supervisorLocationId) {
      whereCondition.locationId = supervisorLocationId;
    }

    const existing = await prisma.attendance.findFirst({
      where: whereCondition,
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Registro de asistencia no encontrado o sin permisos en esta sede" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (data.status) {
      updateData.status = data.status;
      updateData.statusChangedAt = new Date();
      updateData.statusChangedBy = session.user.name || session.user.email || "ADMIN";
    }
    if (data.entryTime !== undefined) {
      updateData.entryTime = parseTimeString(data.entryTime, existing.date);
    }
    if (data.exitTime !== undefined) {
      updateData.exitTime = parseTimeString(data.exitTime, existing.date);
    }
    if (data.entryTime2 !== undefined) {
      updateData.entryTime2 = parseTimeString(data.entryTime2, existing.date);
    }
    if (data.exitTime2 !== undefined) {
      updateData.exitTime2 = parseTimeString(data.exitTime2, existing.date);
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.lateMinutes !== undefined) {
      updateData.lateMinutes = data.lateMinutes;
    }
    if (data.lateMinutes2 !== undefined) {
      updateData.lateMinutes2 = data.lateMinutes2;
    }

    // Auto-recalculate workedMinutes if entry/exit times were updated and workedMinutes was not explicitly provided
    if (data.workedMinutes !== undefined) {
      updateData.workedMinutes = data.workedMinutes;
    } else if (
      data.entryTime !== undefined ||
      data.exitTime !== undefined ||
      data.entryTime2 !== undefined ||
      data.exitTime2 !== undefined
    ) {
      const finalEntry1 = data.entryTime !== undefined ? updateData.entryTime : existing.entryTime;
      const finalExit1 = data.exitTime !== undefined ? updateData.exitTime : existing.exitTime;
      const finalEntry2 = data.entryTime2 !== undefined ? updateData.entryTime2 : existing.entryTime2;
      const finalExit2 = data.exitTime2 !== undefined ? updateData.exitTime2 : existing.exitTime2;

      let calcMinutes = 0;
      if (finalEntry1 && finalExit1) {
        calcMinutes += Math.max(0, differenceInMinutes(finalExit1, finalEntry1));
      }
      if (finalEntry2 && finalExit2) {
        calcMinutes += Math.max(0, differenceInMinutes(finalExit2, finalEntry2));
      }
      updateData.workedMinutes = calcMinutes > 0 ? calcMinutes : null;
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    // ── Log de Auditoría ───────────────────────────────────────────────────
    const auditAction =
      data.status === AttendanceStatus.JUSTIFICADO || data.status === AttendanceStatus.PERMISO
        ? AuditAction.ATTENDANCE_JUSTIFIED
        : AuditAction.ATTENDANCE_EDITED_MANUAL;

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: auditAction,
      entityType: "ATTENDANCE",
      entityId: id,
      oldData: {
        status: existing.status,
        entryTime: existing.entryTime,
        exitTime: existing.exitTime,
        notes: existing.notes,
        lateMinutes: existing.lateMinutes,
      },
      newData: {
        status: updated.status,
        entryTime: updated.entryTime,
        exitTime: updated.exitTime,
        notes: updated.notes,
        lateMinutes: updated.lateMinutes,
        modifiedBy: session.user.email,
      },
      req,
    });

    return NextResponse.json({ attendance: updated });
  } catch (error: any) {
    console.error("Error al actualizar asistencia:", error);
    return NextResponse.json(
      { error: "Error al actualizar asistencia" },
      { status: 500 }
    );
  }
}

export const PUT = PATCH;

