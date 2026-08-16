import { auth } from "@/auth";
import { prisma, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { generateSignedQrPayload } from "@/lib/qrCrypto";
import { logAuditEvent } from "@/lib/audit";

// POST /api/users/[id]/revoke-qr
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
    const existing = await prisma.user.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const newQrToken = crypto.randomUUID();

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        qrToken: newQrToken,
        qrGeneratedAt: new Date(),
        qrInvalidatedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        qrToken: true,
        qrGeneratedAt: true,
      },
    });

    const signedQrPayload = generateSignedQrPayload(updatedUser.id, updatedUser.qrToken);

    // ── Log de Auditoría ───────────────────────────────────────────────────
    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: AuditAction.QR_REGENERATED,
      entityType: "USER",
      entityId: id,
      oldData: { qrToken: existing.qrToken, qrGeneratedAt: existing.qrGeneratedAt },
      newData: { qrToken: updatedUser.qrToken, qrGeneratedAt: updatedUser.qrGeneratedAt, requestedBy: session.user.email },
      req,
    });

    return NextResponse.json({
      message: "Código QR regenerado exitosamente",
      user: {
        ...updatedUser,
        signedQrPayload,
      },
    });
  } catch (error: any) {
    console.error("Error al regenerar QR:", error);
    return NextResponse.json({ error: "Error al regenerar código QR" }, { status: 500 });
  }
}
