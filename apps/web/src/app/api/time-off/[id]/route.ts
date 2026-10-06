import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@asistencias/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(role)) {
      return NextResponse.json({ error: "Permisos insuficientes para revisar solicitudes" }, { status: 403 });
    }

    const organizationId = (session.user as any).organizationId;
    const { id } = await params;
    const body = await req.json();
    const { action, rejectionReason } = body; // action: "APPROVE" | "REJECT"

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const existing = await prisma.timeOffRequest.findFirst({
      where: { id, organizationId },
      include: { user: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    const updated = await prisma.timeOffRequest.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        rejectionReason: action === "REJECT" ? rejectionReason?.trim() || "No especificado" : null,
      },
    });

    // Si se aprueba, sincronizar inmediatamente los registros de asistencia existentes en el rango de fechas
    if (action === "APPROVE") {
      let statusToSet: any = "PERMISO";
      if (existing.type === "VACACIONES") statusToSet = "VACACIONES";
      else if (existing.type === "DESCANSO_MEDICO") statusToSet = "DESCANSO_MEDICO";

      await prisma.attendance.updateMany({
        where: {
          userId: existing.userId,
          date: {
            gte: existing.startDate,
            lte: existing.endDate,
          },
          status: { in: ["PENDIENTE", "AUSENTE"] },
          entryTime: null,
        },
        data: {
          status: statusToSet,
          statusChangedBy: session.user.id,
          statusChangedAt: new Date(),
          notes: `Ausencia aprobada: ${existing.type.replace(/_/g, " ")}`,
        },
      });
    }

    // Registrar en auditoría de forma segura
    try {
      const actorUser = session.user?.id
        ? await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true },
          })
        : null;

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId: actorUser?.id || null,
          action: action === "APPROVE" ? "TIME_OFF_APPROVED" : "TIME_OFF_REJECTED",
          entityType: "TIME_OFF_REQUEST",
          entityId: id,
          oldData: { status: existing.status },
          newData: {
            status: newStatus,
            reviewedBy: session.user.id,
            rejectionReason: updated.rejectionReason,
          },
        },
      });
    } catch (auditErr) {
      console.warn("[TimeOff API] Could not create audit log:", auditErr);
    }

    // Notificar al colaborador
    try {
      const typeLabel = existing.type.replace(/_/g, " ").toLowerCase();
      await prisma.notification.create({
        data: {
          userId: existing.userId,
          type: "CAMBIO_SEDE_HORARIO",
          title: action === "APPROVE" ? "Solicitud de ausencia aprobada" : "Solicitud de ausencia rechazada",
          body: action === "APPROVE"
            ? `Tu solicitud de ${typeLabel} ha sido aprobada.`
            : `Tu solicitud de ${typeLabel} fue rechazada. Motivo: ${updated.rejectionReason || "Revisión administrativa"}.`,
          data: { timeOffRequestId: id, status: newStatus },
        },
      });
    } catch (notifErr) {
      console.warn("Could not create notification for user:", notifErr);
    }

    return NextResponse.json({ success: true, request: updated });
  } catch (error: any) {
    console.error("[TimeOff API] Error updating request:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const organizationId = (session.user as any).organizationId;
    const { id } = await params;

    const existing = await prisma.timeOffRequest.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    await prisma.timeOffRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Solicitud eliminada con éxito" });
  } catch (error: any) {
    console.error("[TimeOff API] Error deleting request:", error);
    return NextResponse.json({ error: "Error al eliminar la solicitud" }, { status: 500 });
  }
}
