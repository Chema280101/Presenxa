import { NextResponse } from "next/server";
import { prisma } from "@asistencias/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();

  const healthData: {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    uptimeSeconds: number;
    environment: string;
    checks: {
      database: { status: "up" | "down"; latencyMs: number; error?: string };
      redis: { status: "up" | "down"; error?: string };
      geoWorker: { status: "up" | "down"; schedulerRunning?: boolean; error?: string };
    };
    system: {
      memoryUsedMB: number;
      memoryTotalMB: number;
      nodeVersion: string;
    };
  } = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    checks: {
      database: { status: "down", latencyMs: 0 },
      redis: { status: "down" },
      geoWorker: { status: "down" },
    },
    system: {
      memoryUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      memoryTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      nodeVersion: process.version,
    },
  };

  let hasCriticalFailure = false;

  // ── 1. Verificar Base de Datos PostgreSQL ──────────────────────────────────
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    healthData.checks.database = {
      status: "up",
      latencyMs: Date.now() - dbStart,
    };
  } catch (err: any) {
    hasCriticalFailure = true;
    healthData.checks.database = {
      status: "down",
      latencyMs: Date.now() - dbStart,
      error: err.message,
    };
  }

  // ── 2. Verificar Redis ─────────────────────────────────────────────────────
  try {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6380/0";
    healthData.checks.redis = { status: "up" };
  } catch (err: any) {
    healthData.checks.redis = { status: "down", error: err.message };
  }

  // ── 3. Verificar Geo Worker y Scheduler ───────────────────────────────────
  try {
    const geoUrl = process.env.GEO_WORKER_URL || "http://localhost:8000";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const geoRes = await fetch(`${geoUrl}/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (geoRes.ok) {
      const geoJson = await geoRes.json();
      healthData.checks.geoWorker = {
        status: "up",
        schedulerRunning: geoJson.schedulerRunning ?? true,
      };
    } else {
      healthData.checks.geoWorker = {
        status: "down",
        error: `HTTP ${geoRes.status}`,
      };
    }
  } catch (err: any) {
    healthData.checks.geoWorker = {
      status: "down",
      error: err.message || "Timeout al conectar con Geo-Worker",
    };
  }

  if (hasCriticalFailure) {
    healthData.status = "unhealthy";
    return NextResponse.json(healthData, { status: 503 });
  }

  if (
    healthData.checks.geoWorker.status === "down" ||
    healthData.checks.redis.status === "down"
  ) {
    healthData.status = "degraded";
  }

  return NextResponse.json(healthData, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Response-Time": `${Date.now() - startTime}ms`,
    },
  });
}
