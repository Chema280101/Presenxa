import Redis from "ioredis";

// Cliente Redis singleton para rate limiting con reconexión silenciosa
let redisClient: Redis | null = null;
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

// Limpiar expirados cada 5 minutos para evitar memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, mem] of memoryStore.entries()) {
    if (now > mem.expiresAt) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6380/0";
  try {
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000), // Retry con backoff hasta 3s
    });
    redisClient.connect().catch((err) => {
      console.warn("[RateLimit] Redis no disponible, usando fallback en memoria:", err.message);
      redisClient = null;
    });
    return redisClient;
  } catch (err) {
    return null;
  }
}

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Valida si una clave ha superado el límite de peticiones en la ventana de tiempo.
 */
export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = options;
  const redis = getRedisClient();

  if (redis && redis.status === "ready") {
    try {
      const fullKey = `ratelimit:${key}`;
      const current = await redis.incr(fullKey);

      if (current === 1) {
        await redis.expire(fullKey, windowSeconds);
      }

      const ttl = await redis.ttl(fullKey);
      const remaining = Math.max(0, limit - current);

      return {
        success: current <= limit,
        limit,
        remaining,
        resetSeconds: Math.max(1, ttl),
      };
    } catch (err) {
      console.warn("[RateLimit] Error en consulta Redis, cambiando a memoria:", err);
    }
  }

  // ── Fallback en memoria (si Redis está caído o inaccesible) ────────────────
  const now = Date.now();
  const mem = memoryStore.get(key);

  if (!mem || now > mem.expiresAt) {
    memoryStore.set(key, {
      count: 1,
      expiresAt: now + windowSeconds * 1000,
    });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetSeconds: windowSeconds,
    };
  }

  mem.count += 1;
  const remaining = Math.max(0, limit - mem.count);
  const resetSeconds = Math.max(1, Math.ceil((mem.expiresAt - now) / 1000));

  return {
    success: mem.count <= limit,
    limit,
    remaining,
    resetSeconds,
  };
}
