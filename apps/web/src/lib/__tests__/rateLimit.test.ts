/**
 * ═══════════════════════════════════════════════════════════════════════
 *  TEST SUITE: rateLimit — Rate limiter con fallback en memoria
 *  Cubre: A-4 (bypass en serverless), race conditions,
 *         expiración de ventana, y correctitud del conteo
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit } from "@/lib/rateLimit";

// Force memory fallback (no Redis in tests)
vi.stubEnv("REDIS_URL", "");

describe("rateLimit (fallback en memoria)", () => {
  // ─────────────────────────────────────────────────────────────────
  //  Funcionalidad básica
  // ─────────────────────────────────────────────────────────────────
  describe("Conteo básico", () => {
    it("permite la primera petición", async () => {
      const result = await checkRateLimit({
        key: `test-basic-${Date.now()}`,
        limit: 5,
        windowSeconds: 60,
      });
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("permite exactamente N peticiones (límite inclusivo)", async () => {
      const key = `test-exact-${Date.now()}`;
      const opts = { key, limit: 3, windowSeconds: 60 };

      const r1 = await checkRateLimit(opts);
      const r2 = await checkRateLimit(opts);
      const r3 = await checkRateLimit(opts);
      const r4 = await checkRateLimit(opts);

      expect(r1.success).toBe(true);
      expect(r1.remaining).toBe(2);
      expect(r2.success).toBe(true);
      expect(r2.remaining).toBe(1);
      expect(r3.success).toBe(true);
      expect(r3.remaining).toBe(0);
      expect(r4.success).toBe(false); // Excedido
      expect(r4.remaining).toBe(0);
    });

    it("retorna remaining = 0 cuando se excede (nunca negativo)", async () => {
      const key = `test-negative-${Date.now()}`;
      const opts = { key, limit: 1, windowSeconds: 60 };

      await checkRateLimit(opts);
      const exceeded = await checkRateLimit(opts);
      const exceeded2 = await checkRateLimit(opts);

      expect(exceeded.remaining).toBe(0);
      expect(exceeded2.remaining).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  Aislamiento de keys
  // ─────────────────────────────────────────────────────────────────
  describe("Aislamiento de keys", () => {
    it("keys diferentes no interfieren entre sí", async () => {
      const keyA = `test-iso-A-${Date.now()}`;
      const keyB = `test-iso-B-${Date.now()}`;

      // Agotar keyA
      for (let i = 0; i < 3; i++) {
        await checkRateLimit({ key: keyA, limit: 2, windowSeconds: 60 });
      }

      // keyB debería seguir disponible
      const result = await checkRateLimit({
        key: keyB,
        limit: 2,
        windowSeconds: 60,
      });
      expect(result.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  Estrés: ráfaga masiva
  // ─────────────────────────────────────────────────────────────────
  describe("Estrés", () => {
    it("🧪 STRESS: 200 peticiones concurrentes, solo 10 pasan", async () => {
      const key = `test-stress-${Date.now()}`;
      const limit = 10;
      const opts = { key, limit, windowSeconds: 60 };

      const promises = Array.from({ length: 200 }, () => checkRateLimit(opts));
      const results = await Promise.all(promises);

      const passed = results.filter((r) => r.success).length;
      const blocked = results.filter((r) => !r.success).length;

      expect(passed).toBe(limit);
      expect(blocked).toBe(190);
    });

    it("🧪 STRESS: 500 peticiones secuenciales, conteo exacto", async () => {
      const key = `test-stress-seq-${Date.now()}`;
      const limit = 50;
      const opts = { key, limit, windowSeconds: 60 };

      let passedCount = 0;
      for (let i = 0; i < 500; i++) {
        const result = await checkRateLimit(opts);
        if (result.success) passedCount++;
      }

      expect(passedCount).toBe(limit);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  Expiración de ventana
  // ─────────────────────────────────────────────────────────────────
  describe("Expiración", () => {
    it("🧪 EDGE: Ventana de 1 segundo se resetea", async () => {
      const key = `test-expire-${Date.now()}`;
      const opts = { key, limit: 1, windowSeconds: 1 };

      const r1 = await checkRateLimit(opts);
      expect(r1.success).toBe(true);

      const r2 = await checkRateLimit(opts);
      expect(r2.success).toBe(false);

      // Esperar a que expire
      await new Promise((r) => setTimeout(r, 1100));

      const r3 = await checkRateLimit(opts);
      expect(r3.success).toBe(true);
    });

    it("resetSeconds retorna un valor positivo", async () => {
      const key = `test-reset-${Date.now()}`;
      const result = await checkRateLimit({
        key,
        limit: 5,
        windowSeconds: 300,
      });
      expect(result.resetSeconds).toBeGreaterThan(0);
      expect(result.resetSeconds).toBeLessThanOrEqual(300);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  Simulación de escenarios de login brute-force
  // ─────────────────────────────────────────────────────────────────
  describe("Escenario: Login Brute Force", () => {
    it("permite 5 intentos y bloquea el 6to (configuración real)", async () => {
      const email = `bruteforce-${Date.now()}@test.com`;
      const key = `login_attempt:${email}`;
      const opts = { key, limit: 5, windowSeconds: 300 };

      for (let i = 0; i < 5; i++) {
        const r = await checkRateLimit(opts);
        expect(r.success).toBe(true);
      }

      const blocked = await checkRateLimit(opts);
      expect(blocked.success).toBe(false);
      expect(blocked.resetSeconds).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  Simulación de escenarios de Kiosk scan
  // ─────────────────────────────────────────────────────────────────
  describe("Escenario: Kiosk Scan Burst", () => {
    it("permite 120 escaneos por minuto por kiosk (configuración real)", async () => {
      const kioskApiKey = `kiosk-${Date.now()}`;
      const key = `kiosk_scan:${kioskApiKey}:192.168.1.1`;
      const opts = { key, limit: 120, windowSeconds: 60 };

      let passedCount = 0;
      for (let i = 0; i < 150; i++) {
        const r = await checkRateLimit(opts);
        if (r.success) passedCount++;
      }

      expect(passedCount).toBe(120);
    });
  });
});
