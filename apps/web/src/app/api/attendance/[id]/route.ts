import { auth } from "@/auth";
import { prisma, AttendanceStatus, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";

const PatchAttendanceSchema = z.object({
  status: z.nativeEnum(AttendanceStatus).optional(),
  entryTime: z.string().datetime().optional().nullable(),
  exitTime: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  lateMinutes: z.number().int().min(0).optional().nullable(),
});

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
      updateData.entryTime = data.entryTime ? new Date(data.entryTime) : null;
    }
    if (data.exitTime !== undefined) {
      updateData.exitTime = data.exitTime ? new Date(data.exitTime) : null;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.lateMinutes !== undefined) {
      updateData.lateMinutes = data.lateMinutes;
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
