import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";

// POST /api/kiosks/heartbeat
export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-kiosk-api-key");
    if (!apiKey) {
      return NextResponse.json({ error: "Falta x-kiosk-api-key" }, { status: 401 });
    }

    const kiosk = await prisma.kiosk.findUnique({
      where: { apiKey },
      include: {
        location: {
          select: { id: true, name: true, timezone: true },
        },
      },
    });

    if (!kiosk || !kiosk.isActive) {
      return NextResponse.json(
        { error: "Kiosk inválido o inactivo" },
        { status: 401 }
      );
    }

    // Get IP address from headers
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    await prisma.kiosk.update({
      where: { id: kiosk.id },
      data: {
        lastSeenAt: new Date(),
        ipAddress,
      },
    });

    return NextResponse.json({
      status: "ONLINE",
      serverTime: new Date().toISOString(),
      location: kiosk.location,
      kiosk: { id: kiosk.id, name: kiosk.name },
    });
  } catch (error: any) {
    console.error("Error en heartbeat de kiosk:", error);
    return NextResponse.json(
      { error: "Error en el servicio de heartbeat" },
      { status: 500 }
    );
  }
}
