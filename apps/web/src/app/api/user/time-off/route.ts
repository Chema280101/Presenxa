import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@asistencias/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { type, startDate, endDate, reason, documentUrl } = await req.json();

    if (!startDate || !endDate || !type) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const userId = session.user.id;
    const orgId = (session.user as any).organizationId;

    const request = await prisma.timeOffRequest.create({
      data: {
        userId,
        organizationId: orgId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || null,
        documentUrl: documentUrl || null,
        status: "PENDING",
      }
    });

    return NextResponse.json({ success: true, data: request });
  } catch (error: any) {
    console.error("[TimeOffRequest] Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
