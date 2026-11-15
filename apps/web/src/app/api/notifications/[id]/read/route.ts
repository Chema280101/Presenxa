import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@asistencias/db";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Validar que la notificación exista y pertenezca al usuario autenticado (o a su org)
    const existing = await prisma.notification.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Notificación no encontrada o no pertenece al usuario" },
        { status: 404 }
      );
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      notification: updated,
    });
  } catch (error: any) {
    console.error("Error al marcar notificación:", error);
    return NextResponse.json(
      { error: "No se pudo marcar la notificación como leída" },
      { status: 500 }
    );
  }
}
