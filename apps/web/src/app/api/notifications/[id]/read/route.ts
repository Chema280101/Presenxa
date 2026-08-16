import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@asistencias/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
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
