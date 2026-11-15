import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, AuditAction } from "@asistencias/db";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { logAuditEvent } from "@/lib/audit";

function generateTempPassword(): string {
  const digits = crypto.randomInt(1000, 9999);
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const c1 = chars[crypto.randomInt(0, chars.length)];
  const c2 = chars[crypto.randomInt(0, chars.length)];
  return `Prx${c1}${c2}-${digits}`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json(
        { error: "Solo Administradores pueden restablecer contraseñas" },
        { status: 403 }
      );
    }

    const { id } = await params;
    let body: { newPassword?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, organizationId: session.user.organizationId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const plainPassword =
      body.newPassword && body.newPassword.trim().length >= 6
        ? body.newPassword.trim()
        : generateTempPassword();

    const passwordHash = await bcrypt.hash(plainPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: AuditAction.USER_PASSWORD_RESET,
      entityType: "USER",
      entityId: id,
      newData: {
        targetEmail: targetUser.email,
        resetBy: session.user.email || session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      temporaryPassword: plainPassword,
      userName: `${targetUser.firstName} ${targetUser.lastName}`.trim(),
    });
  } catch (error) {
    console.error("[ResetPassword API] Error:", error);
    return NextResponse.json(
      { error: "Error al restablecer la contraseña" },
      { status: 500 }
    );
  }
}
