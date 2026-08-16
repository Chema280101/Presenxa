import { auth } from "@/auth";
import { prisma, AttendanceStatus, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";

const VerifyDniSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().optional(),
});

// POST /api/attendance/[id]/verify-dni
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "SUPERVISOR") {
    return NextResponse.json(
      { error: "No tienes permisos para validar marcaciones por DNI" },
      { status: 403 }
    );
  }

  const supervisorLocationId = (session.user as any).locationId;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = VerifyDniSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { action, reason } = parsed.data;

    // Multi-tenant & RBAC: Verify attendance belongs to this organization
    const whereCondition: any = {
      id,
      user: { organizationId: session.user.organizationId },
    };

    if (role === "SUPERVISOR" && supervisorLocationId) {
      whereCondition.locationId = supervisorLocationId;
    }

    const existing = await prisma.attendance.findFirst({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            documentId: true,
          },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Registro de asistencia no encontrado o sin permisos en esta sede" },
        { status: 404 }
      );
    }

    const now = new Date();
    const adminName = session.user.name || session.user.email || "ADMIN";

    let updatedAttendance;

    if (action === "APPROVE") {
      // Limpiar la marca de pendiente en las notas y registrar aprobación
      const cleanNotes = (existing.notes || "")
        .replace(/\[PENDIENTE_VALIDACION_DNI\]/g, "[DNI_APROBADO]")
        .trim();

      const finalNotes = cleanNotes
        ? `${cleanNotes} | Aprobado por ${adminName} a las ${now.toLocaleTimeString("es-PE")}`
        : `Marcación por DNI aprobada por ${adminName}`;

      updatedAttendance = await prisma.attendance.update({
        where: { id },
        data: {
          notes: finalNotes,
          statusChangedBy: `APROBADO_DNI_${adminName}`,
          statusChangedAt: now,
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

      // Marcar las notificaciones relacionadas como leídas
      try {
        await prisma.notification.updateMany({
          where: {
            user: { organizationId: session.user.organizationId },
            data: {
              path: ["attendanceId"],
              equals: id,
            },
            readAt: null,
          },
          data: { readAt: now },
        });
      } catch {}

      // Log de Auditoría
      await logAuditEvent({
        organizationId: session.user.organizationId,
        userId: session.user.id,
        action: AuditAction.ATTENDANCE_STATUS_CHANGED,
        entityType: "ATTENDANCE",
        entityId: id,
        oldData: { notes: existing.notes, status: existing.status },
        newData: {
          notes: finalNotes,
          status: updatedAttendance.status,
          decision: "APPROVED_DNI",
          approvedBy: adminName,
        },
        req,
      });

      return NextResponse.json({
        success: true,
        message: `Marcación por DNI de ${existing.user.firstName} ${existing.user.lastName} aprobada exitosamente.`,
        attendance: updatedAttendance,
      });
    } else {
      // REJECT: Anular la marcación
      const rejectNote = `[DNI_RECHAZADO] Marcación por DNI anulada por ${adminName} a las ${now.toLocaleTimeString("es-PE")}. ${reason ? "Motivo: " + reason : "Posible suplantación o error."}`;

      updatedAttendance = await prisma.attendance.update({
        where: { id },
        data: {
          entryTime: null,
          exitTime: null,
          workedMinutes: null,
          lateMinutes: null,
          status: AttendanceStatus.PENDIENTE,
          notes: rejectNote,
          statusChangedBy: `RECHAZADO_DNI_${adminName}`,
          statusChangedAt: now,
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

      // Marcar las notificaciones relacionadas como leídas
      try {
        await prisma.notification.updateMany({
          where: {
            user: { organizationId: session.user.organizationId },
            data: {
              path: ["attendanceId"],
              equals: id,
            },
            readAt: null,
          },
          data: { readAt: now },
        });
      } catch {}

      // Log de Auditoría
      await logAuditEvent({
        organizationId: session.user.organizationId,
        userId: session.user.id,
        action: AuditAction.ATTENDANCE_STATUS_CHANGED,
        entityType: "ATTENDANCE",
        entityId: id,
        oldData: { notes: existing.notes, status: existing.status, entryTime: existing.entryTime },
        newData: {
          notes: rejectNote,
          status: AttendanceStatus.PENDIENTE,
          decision: "REJECTED_DNI",
          rejectedBy: adminName,
          reason,
        },
        req,
      });

      return NextResponse.json({
        success: true,
        message: `Marcación por DNI rechazada y anulada.`,
        attendance: updatedAttendance,
      });
    }
  } catch (error: any) {
    console.error("Error al verificar marcación DNI:", error);
    return NextResponse.json(
      { error: "Error al procesar la verificación" },
      { status: 500 }
    );
  }
}
