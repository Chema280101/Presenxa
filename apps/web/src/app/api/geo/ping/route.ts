import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";
import { prisma } from "@asistencias/db";

const pingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nullable().optional(),
  source: z.string().default("APP"),
  offlineTimestamp: z.string().optional(),
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

  // ── 1. RATE LIMITING: Máximo 4 pings por minuto por usuario ───────────────
  const rateResult = await checkRateLimit({
    key: `geo_ping:${userId}`,
    limit: 4,
    windowSeconds: 60,
  });

  if (!rateResult.success) {
    return NextResponse.json(
      {
        error: "Frecuencia de pings de geolocalización excedida (máx. 4 req/min).",
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
    const parsed = pingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de ubicación inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { accuracy, latitude, longitude, source } = parsed.data;

    // ── 2. VALIDACIÓN DE PRECISIÓN GPS (Accuracy filter) ────────────────────
    // Si la precisión del sensor es mayor a 100m (o negativa/irreal), se descarta
    if (accuracy !== null && accuracy !== undefined && (accuracy > 100 || accuracy <= 0)) {
      return NextResponse.json({
        status: "POOR_ACCURACY_SKIPPED",
        is_inside: null,
        message: `Precisión GPS insuficiente (${Math.round(accuracy)}m > 100m). Ping descartado para evitar falsos positivos.`,
      });
    }

    const geoWorkerUrl = process.env.GEO_WORKER_URL;
    const geoWorkerSecret = process.env.GEO_WORKER_SECRET || "dev-worker-secret";

    // Si GEO_WORKER_URL está configurado, intentar primero con el microservicio
    if (geoWorkerUrl) {
      try {
        const workerPayload = {
          user_id: userId,
          latitude,
          longitude,
          accuracy: accuracy ?? null,
          source,
          timestamp: parsed.data.offlineTimestamp || undefined,
        };

        const response = await fetch(`${geoWorkerUrl}/api/geo/ping`, {
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
        console.warn("[GeoPing] Worker inaccesible, ejecutando fallback directo a base de datos:", workerErr);
      }
    }

    // ── 3. FALLBACK DIRECTO A BASE DE DATOS VIA PRISMA ─────────────────────────
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

    let isInside = true;
    if (user?.location?.geofenceLat && user?.location?.geofenceLng) {
      const dist = calculateDistanceMeters(
        latitude,
        longitude,
        user.location.geofenceLat,
        user.location.geofenceLng
      );
      isInside = dist <= (user.location.geofenceRadius || 100);
    }

    const isShiftActive = Boolean(
      (attendance?.entryTime && !attendance?.exitTime) ||
      (attendance?.entryTime2 && !attendance?.exitTime2)
    );

    const pingSource = source === "MANUAL" ? "MANUAL" : source.includes("BACKGROUND") ? "BACKGROUND_FETCH" : "APP";

    const createdPing = await prisma.geoPing.create({
      data: {
        userId,
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        isInsideZone: isInside,
        source: pingSource as any,
        attendanceId: isShiftActive ? attendance?.id : null,
        timestamp: parsed.data.offlineTimestamp ? new Date(parsed.data.offlineTimestamp) : new Date(),
      },
    });

    return NextResponse.json({
      status: isInside ? "INSIDE" : "OUTSIDE",
      is_inside: isInside,
      message: isShiftActive ? (isInside ? "Dentro de zona laboral" : "Fuera de zona laboral") : "Sin jornada activa",
      ping_id: createdPing.id,
    });
  } catch (error: any) {
    console.error("Error al procesar geo ping:", error);
    return NextResponse.json(
      { error: "Error al registrar la ubicación", details: error.message },
      { status: 500 }
    );
  }
}
