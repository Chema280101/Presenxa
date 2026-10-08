import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { generateSignedQrPayload, verifySignedQrPayload } from "@/lib/qrCrypto";
import { getLocalTodayDate } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = performance.now();

  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    // ── 1. Prueba de Base de Datos PostgreSQL ─────────────────────────────────
    const dbStart = performance.now();
    let dbStatus: "up" | "down" = "down";
    let dbLatency = 0;
    let dbError: string | null = null;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Math.round(performance.now() - dbStart);
      dbStatus = "up";
    } catch (err: any) {
      dbLatency = Math.round(performance.now() - dbStart);
      dbError = err?.message || "Error al conectar con la base de datos";
    }

    // ── 2. Telemetría de Kioskos en Tiempo Real ──────────────────────────────
    const kiosks = await prisma.kiosk.findMany({
      where: {
        location: {
          organizationId,
        },
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastSeenAt: true,
        ipAddress: true,
        location: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        lastSeenAt: "desc",
      },
    });

    const now = Date.now();
    const twoMinutesMs = 2 * 60 * 1000;

    const totalKiosks = kiosks.length;
    const activeKiosks = kiosks.filter((k) => k.isActive).length;
    const onlineKiosks = kiosks.filter(
      (k) => k.isActive && k.lastSeenAt && now - new Date(k.lastSeenAt).getTime() <= twoMinutesMs
    ).length;
    const offlineKiosks = totalKiosks - onlineKiosks;

    const mostRecentKiosk = kiosks.find((k) => k.lastSeenAt !== null);

    // ── 3. Benchmark y Auditoría Criptográfica HMAC-SHA256 en Vivo ──────────
    const cryptoStart = performance.now();
    let cryptoStatus: "verified" | "failed" = "failed";
    let cryptoLatencyMs = 0;
    let cryptoDetails = "";

    try {
      const sampleUserId = "diag-user-001";
      const sampleToken = "diag-token-uuid-v4";
      const signedPayload = generateSignedQrPayload(sampleUserId, sampleToken);
      const verificationResult = verifySignedQrPayload(signedPayload, 90);

      cryptoLatencyMs = Number((performance.now() - cryptoStart).toFixed(2));

      if (verificationResult.isValid && verificationResult.userId === sampleUserId) {
        cryptoStatus = "verified";
        cryptoDetails = "Firma HMAC-SHA256 generada y autenticada con éxito";
      } else {
        cryptoDetails = verificationResult.error || "Falla en verificación criptográfica";
      }
    } catch (err: any) {
      cryptoLatencyMs = Number((performance.now() - cryptoStart).toFixed(2));
      cryptoDetails = err?.message || "Excepción en el motor criptográfico";
    }

    const hasDedicatedSecret = Boolean(process.env.QR_HMAC_SECRET);

    // ── 4. Métricas de Modo Ultra-Offline y Búfer ────────────────────────────
    const todayDate = getLocalTodayDate();

    const [offlineSyncToday, offlineSyncTotal] = await Promise.all([
      prisma.attendance.count({
        where: {
          location: { organizationId },
          isOfflineSync: true,
          date: todayDate,
        },
      }),
      prisma.attendance.count({
        where: {
          location: { organizationId },
          isOfflineSync: true,
        },
      }),
    ]);

    // ── 5. Métricas de Servidor & Runtime Node.js ────────────────────────────
    const totalDurationMs = Math.round(performance.now() - startTime);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      executionTimeMs: totalDurationMs,
      checks: {
        api: {
          status: "up",
          latencyMs: totalDurationMs,
        },
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
          error: dbError,
        },
        crypto: {
          status: cryptoStatus,
          algorithm: "HMAC-SHA256",
          latencyMs: cryptoLatencyMs,
          secretMode: hasDedicatedSecret ? "PRODUCTION_DEDICATED" : "SYSTEM_AUTH_SHARED",
          details: cryptoDetails,
        },
        kiosks: {
          total: totalKiosks,
          active: activeKiosks,
          online: onlineKiosks,
          offline: offlineKiosks,
          lastHeartbeat: mostRecentKiosk
            ? {
                name: mostRecentKiosk.name,
                location: mostRecentKiosk.location.name,
                ipAddress: mostRecentKiosk.ipAddress || "Desconocida",
                lastSeenAt: mostRecentKiosk.lastSeenAt,
                minutesAgo: mostRecentKiosk.lastSeenAt
                  ? Math.round((now - new Date(mostRecentKiosk.lastSeenAt).getTime()) / 60000)
                  : null,
              }
            : null,
        },
        offlineBuffer: {
          todaySyncCount: offlineSyncToday,
          totalSyncCount: offlineSyncTotal,
          protocol: "SQLite Local Buffer + Batch Replay Sync",
          batchSizeMax: 50,
        },
        system: {
          uptimeSeconds: Math.floor(process.uptime()),
          memoryUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          memoryTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || "development",
        },
      },
    });
  } catch (error: any) {
    console.error("Error en telemetría de kiosks:", error);
    return NextResponse.json(
      { error: "Error interno al ejecutar diagnóstico de telemetría" },
      { status: 500 }
    );
  }
}
