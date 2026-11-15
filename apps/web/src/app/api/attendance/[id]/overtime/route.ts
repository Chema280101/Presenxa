import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, AuditAction, OvertimeStatus } from "@asistencias/db";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";

const OvertimeReviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(role)) {
      return NextResponse.json(
        { error: "Permisos insuficientes para aprobar o rechazar horas extras" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = OvertimeReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const existing = await prisma.attendance.findFirst({
      where: {
        id,
        user: { organizationId: session.user.organizationId },
      },
      select: { id: true, overtimeMinutes: true, overtimeStatus: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    const newStatus =
      parsed.data.action === "APPROVE"
        ? OvertimeStatus.APPROVED
        : OvertimeStatus.REJECTED;

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        overtimeStatus: newStatus,
        statusChangedBy: session.user.name || session.user.email || "ADMIN",
        statusChangedAt: new Date(),
      },
    });

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: AuditAction.OVERTIME_REVIEWED,
      entityType: "ATTENDANCE",
      entityId: id,
      oldData: {
        overtimeMinutes: existing.overtimeMinutes,
        overtimeStatus: existing.overtimeStatus,
      },
      newData: {
        overtimeMinutes: updated.overtimeMinutes,
        overtimeStatus: updated.overtimeStatus,
      },
    });

    return NextResponse.json({ success: true, attendance: updated });
  } catch (error) {
    console.error("[Overtime Review API] Error:", error);
    return NextResponse.json(
      { error: "Error al revisar horas extras" },
      { status: 500 }
    );
  }
}
