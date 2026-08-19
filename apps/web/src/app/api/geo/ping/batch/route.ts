import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";

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

    const geoWorkerUrl = process.env.GEO_WORKER_URL || "http://localhost:8000";
    const geoWorkerSecret = process.env.GEO_WORKER_SECRET || "dev-worker-secret";

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

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "Error en el servicio Geo-Worker al procesar lote", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error al reenviar lote al Geo Worker:", error);
    return NextResponse.json(
      { error: "No se pudo conectar con el servicio de geolocalización" },
      { status: 502 }
    );
  }
}
