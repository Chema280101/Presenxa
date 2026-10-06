import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@asistencias/db";

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

    const existing = await prisma.holiday.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Feriado no encontrado" }, { status: 404 });
    }

    await prisma.holiday.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Feriado eliminado con éxito" });
  } catch (error: any) {
    console.error("[Holidays API] Error deleting holiday:", error);
    return NextResponse.json({ error: "Error al eliminar el feriado" }, { status: 500 });
  }
}
