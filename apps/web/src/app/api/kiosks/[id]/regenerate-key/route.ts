import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/audit";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import crypto from "crypto";

// POST /api/kiosks/[id]/regenerate-key
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as any)?.role;
  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.kiosk.findFirst({
      where: {
        id,
        location: { organizationId: session.user.organizationId },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kiosk no encontrado" }, { status: 404 });
    }

    const newApiKey = crypto.randomUUID();

    const updated = await prisma.kiosk.update({
      where: { id },
      data: {
        apiKey: newApiKey,
      },
      select: {
        id: true,
        name: true,
        apiKey: true,
      },
    });

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "ENTITY_UPDATED",
      entityType: "KIOSK",
      entityId: updated.id,
      oldData: { name: existing.name, apiKeyRotated: false },
      newData: { name: updated.name, apiKeyRotated: true },
      req,
    });

    return NextResponse.json({
      message: "API Key rotada con éxito",
      kiosk: updated,
    });
  } catch (error: any) {
    console.error("Error al regenerar API Key:", error);
    return NextResponse.json(
      { error: "Error al regenerar clave de seguridad" },
      { status: 500 }
    );
  }
}
