import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";

const pingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nullable().optional(),
  source: z.string().default("APP"),
  offlineTimestamp: z.string().optional(),
});

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
    // para evitar falsas alarmas de abandono por oscilación de señal celular.
    if (accuracy !== null && accuracy !== undefined && (accuracy > 100 || accuracy <= 0)) {
      return NextResponse.json({
        status: "POOR_ACCURACY_SKIPPED",
        is_inside: null,
        message: `Precisión GPS insuficiente (${Math.round(accuracy)}m > 100m). Ping descartado para evitar falsos positivos.`,
      });
    }

    const geoWorkerUrl = process.env.GEO_WORKER_URL || "http://localhost:8000";
    const geoWorkerSecret = process.env.GEO_WORKER_SECRET || "dev-worker-secret";

    const workerPayload = {
      user_id: userId,
      latitude,
      longitude,
      accuracy: accuracy ?? null,
      source,
    };

    const response = await fetch(`${geoWorkerUrl}/api/geo/ping`, {
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
        { error: "Error en el servicio Geo-Worker", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error al reenviar ping al Geo Worker:", error);
    return NextResponse.json(
      { error: "No se pudo conectar con el servicio de geolocalización" },
      { status: 502 }
    );
  }
}
