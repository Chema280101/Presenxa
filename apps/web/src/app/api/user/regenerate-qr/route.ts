import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, AuditAction } from "@asistencias/db";
import { randomUUID } from "crypto";
import { generateSignedQrPayload } from "@/lib/qrCrypto";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const newQrToken = randomUUID();
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        qrToken: newQrToken,
        qrGeneratedAt: new Date(),
        qrInvalidatedAt: null,
      },
      select: {
        id: true,
        qrToken: true,
        qrGeneratedAt: true,
        organizationId: true,
      },
    });

    const signedQrPayload = generateSignedQrPayload(updatedUser.id, updatedUser.qrToken);

    // ── Log de Auditoría ───────────────────────────────────────────────────
    await logAuditEvent({
      organizationId: updatedUser.organizationId,
      userId: updatedUser.id,
      action: AuditAction.QR_REGENERATED,
      entityType: "USER",
      entityId: updatedUser.id,
      newData: {
        qrToken: updatedUser.qrToken,
        qrGeneratedAt: updatedUser.qrGeneratedAt,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      qrToken: updatedUser.qrToken,
      signedQrPayload,
      qrGeneratedAt: updatedUser.qrGeneratedAt,
    });
  } catch (error) {
    console.error("Error al regenerar QR del usuario:", error);
    return NextResponse.json(
      { error: "Error al generar nueva credencial QR" },
      { status: 500 }
    );
  }
}
