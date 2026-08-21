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

  if (hasCriticalFailure) {
    healthData.status = "unhealthy";
    return NextResponse.json(healthData, { status: 503 });
  }

  return NextResponse.json(healthData, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Response-Time": `${Date.now() - startTime}ms`,
    },
  });
}
