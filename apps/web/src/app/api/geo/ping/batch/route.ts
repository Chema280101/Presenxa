import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";
import { prisma } from "@asistencias/db";

const pingItemSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nullable().optional(),
  source: z.string().default("OFFLINE_SYNC"),
  timestamp: z.string().optional(),
});

const batchSchema = z.object({
  pings: z.array(pingItemSchema).min(1).max(100),
});

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;

  // ── 1. RATE LIMITING: Máximo 10 batches por minuto por usuario ────────────
  const rateResult = await checkRateLimit({
    key: `geo_ping_batch:${userId}`,
    limit: 10,
    windowSeconds: 60,
  });

  if (!rateResult.success) {
    return NextResponse.json(
      {
        error: "Frecuencia de sincronización masiva excedida (máx. 10 lotes/min).",
        retryAfter: rateResult.resetSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateResult.resetSeconds),
          "X-RateLimit-Limit": String(rateResult.limit),
          "X-RateLimit-Remaining": String(rateResult.remaining),
        },
      }
    );
  }

  try {
    const body = await req.json();
    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de lote inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { pings } = parsed.data;

    // Filtrar pings con precisión deficiente (> 100m)
    const validPings = pings.filter(
      (p) => p.accuracy === null || p.accuracy === undefined || (p.accuracy > 0 && p.accuracy <= 100)
    );

    if (validPings.length === 0) {
      return NextResponse.json({
        processed: pings.length,
        saved: 0,
        message: "Todos los pings fueron omitidos por baja precisión GPS.",
      });
    }

    const geoWorkerUrl = process.env.GEO_WORKER_URL;
    const geoWorkerSecret = process.env.GEO_WORKER_SECRET || "dev-worker-secret";

    if (geoWorkerUrl) {
      try {
        const workerPayload = {
          user_id: userId,
          pings: validPings,
        };

        const response = await fetch(`${geoWorkerUrl}/api/geo/ping/batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-worker-secret": geoWorkerSecret,
          },
          body: JSON.stringify(workerPayload),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch (workerErr) {
        console.warn("[GeoPingBatch] Worker inaccesible, ejecutando fallback directo a base de datos:", workerErr);
      }
    }

    // ── FALLBACK DIRECTO A BASE DE DATOS VIA PRISMA ─────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        location: {
          select: {
            geofenceLat: true,
            geofenceLng: true,
            geofenceRadius: true,
          },
        },
      },
    });

    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: todayDate,
      },
      select: { id: true, entryTime: true, exitTime: true, entryTime2: true, exitTime2: true },
    });

    const isShiftActive = Boolean(
      (attendance?.entryTime && !attendance?.exitTime) ||
      (attendance?.entryTime2 && !attendance?.exitTime2)
    );

    const createdPings = await prisma.$transaction(
      validPings.map((p) => {
        let isInside = true;
        if (user?.location?.geofenceLat && user?.location?.geofenceLng) {
          const dist = calculateDistanceMeters(
            p.latitude,
            p.longitude,
            user.location.geofenceLat,
            user.location.geofenceLng
          );
          isInside = dist <= (user.location.geofenceRadius || 100);
        }

        const pingSource = p.source === "MANUAL" ? "MANUAL" : p.source.includes("BACKGROUND") ? "BACKGROUND_FETCH" : "APP";

        return prisma.geoPing.create({
          data: {
            userId,
            latitude: p.latitude,
            longitude: p.longitude,
            accuracy: p.accuracy ?? null,
            isInsideZone: isInside,
            source: pingSource as any,
            attendanceId: isShiftActive ? attendance?.id : null,
            timestamp: p.timestamp ? new Date(p.timestamp) : new Date(),
          },
        });
      })
    );

    return NextResponse.json({
      processed: pings.length,
      saved: createdPings.length,
      message: `Se sincronizaron ${createdPings.length} pings offline exitosamente.`,
    });
  } catch (error: any) {
    console.error("Error al procesar lote de geo pings:", error);
    return NextResponse.json(
      { error: "Error al registrar el lote de ubicaciones", details: error.message },
      { status: 500 }
    );
  }
}
