import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { generateSignedQrPayload } from "@/lib/qrCrypto";

// GET /api/user/qr-payload
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, qrToken: true, isActive: true, qrInvalidatedAt: true },
    });

    if (!user || !user.isActive || user.qrInvalidatedAt) {
      return NextResponse.json({ error: "Usuario inactivo o credencial revocada" }, { status: 403 });
    }

    const payload = generateSignedQrPayload(user.id, user.qrToken);
    const timestamp = Math.floor(Date.now() / 1000);

    return NextResponse.json({
      success: true,
      payload,
      timestamp,
      validForSeconds: 30,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al generar payload dinámico", detail: error.message },
      { status: 500 }
    );
  }
}
