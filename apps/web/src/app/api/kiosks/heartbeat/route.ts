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
          select: {
            id: true,
            name: true,
            timezone: true,
            organization: {
              select: { settings: true },
            },
          },
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

    const orgSettings = (kiosk.location.organization?.settings as Record<string, unknown> | null) ?? null;
    const offlineBuffer = typeof orgSettings?.offline_buffer === "boolean" ? orgSettings.offline_buffer : true;
    const orgTimezone = typeof orgSettings?.timezone === "string" && orgSettings.timezone ? orgSettings.timezone : null;

    return NextResponse.json({
      status: "ONLINE",
      serverTime: new Date().toISOString(),
      location: {
        id: kiosk.location.id,
        name: kiosk.location.name,
        timezone: kiosk.location.timezone || orgTimezone,
      },
      kiosk: { id: kiosk.id, name: kiosk.name },
      settings: {
        offlineBuffer,
        timezone: kiosk.location.timezone || orgTimezone,
      },
    });
  } catch (error: any) {
    console.error("Error en heartbeat de kiosk:", error);
    return NextResponse.json(
      { error: "Error en el servicio de heartbeat" },
      { status: 500 }
    );
  }
}
