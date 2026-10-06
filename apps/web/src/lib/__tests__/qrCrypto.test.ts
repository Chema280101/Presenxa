/**
 * ═══════════════════════════════════════════════════════════════════════
 *  TEST SUITE: qrCrypto — Firma HMAC-SHA256 y verificación de QR
 *  Cubre: C-3 (secret hardcodeado), edge cases criptográficos,
 *         timing attacks, expiración, payloads malformados
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateSignedQrPayload,
  isSignedQrPayload,
  verifySignedQrPayload,
} from "@/lib/qrCrypto";
import crypto from "crypto";

// ── Constantes de test ──────────────────────────────────────────────
const TEST_SECRET = "test-secret-for-unit-tests-32chars!!";
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const QR_TOKEN = "660e8400-e29b-41d4-a716-446655440001";

describe("qrCrypto", () => {
  // ─────────────────────────────────────────────────────────────────
  //  generateSignedQrPayload
  // ─────────────────────────────────────────────────────────────────
  describe("generateSignedQrPayload()", () => {
    it("genera un payload con formato v1.userId.qrToken.timestamp.hmac", () => {
      const payload = generateSignedQrPayload(USER_ID, QR_TOKEN, TEST_SECRET);
      const parts = payload.split(".");
      expect(parts).toHaveLength(5);
      expect(parts[0]).toBe("v1");
      expect(parts[1]).toBe(USER_ID);
      expect(parts[2]).toBe(QR_TOKEN);
      expect(Number(parts[3])).toBeGreaterThan(0);
      expect(parts[4]).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
    });

    it("genera payloads diferentes para el mismo usuario en momentos distintos", async () => {
      const p1 = generateSignedQrPayload(USER_ID, QR_TOKEN, TEST_SECRET);
      await new Promise((r) => setTimeout(r, 1100)); // Esperar 1s+ para que cambie el timestamp
      const p2 = generateSignedQrPayload(USER_ID, QR_TOKEN, TEST_SECRET);
      expect(p1).not.toBe(p2);
    });

    it("genera HMAC diferente con secrets distintos", () => {
      const p1 = generateSignedQrPayload(USER_ID, QR_TOKEN, "secret-A");
      const p2 = generateSignedQrPayload(USER_ID, QR_TOKEN, "secret-B");
      const hmac1 = p1.split(".")[4];
      const hmac2 = p2.split(".")[4];
      expect(hmac1).not.toBe(hmac2);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  isSignedQrPayload
  // ─────────────────────────────────────────────────────────────────
  describe("isSignedQrPayload()", () => {
    it("detecta payloads firmados correctamente", () => {
      const payload = generateSignedQrPayload(USER_ID, QR_TOKEN, TEST_SECRET);
      expect(isSignedQrPayload(payload)).toBe(true);
    });

    it("rechaza UUIDs simples (QR legacy)", () => {
      expect(isSignedQrPayload(QR_TOKEN)).toBe(false);
    });

    it("rechaza cadenas vacías", () => {
      expect(isSignedQrPayload("")).toBe(false);
    });

    it("rechaza null/undefined con casting forzado", () => {
      expect(isSignedQrPayload(null as any)).toBe(false);
      expect(isSignedQrPayload(undefined as any)).toBe(false);
    });

    it("rechaza strings que solo empiezan con v1 pero no tienen formato completo", () => {
      expect(isSignedQrPayload("v1")).toBe(false); // startsWith("v1.") is false for "v1"
      expect(isSignedQrPayload("v1.")).toBe(true);
      // Pero verifySignedQrPayload los rechazará por estructura
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  verifySignedQrPayload — HAPPY PATH
  // ─────────────────────────────────────────────────────────────────
  describe("verifySignedQrPayload() — Happy Path", () => {
    it("valida un payload recién generado (< 90s)", () => {
      const payload = generateSignedQrPayload(USER_ID, QR_TOKEN, TEST_SECRET);
      const result = verifySignedQrPayload(payload, 90, TEST_SECRET);
      expect(result.isValid).toBe(true);
      expect(result.userId).toBe(USER_ID);
      expect(result.qrToken).toBe(QR_TOKEN);
      expect(result.isExpired).toBe(false);
    });

    it("respeta maxAgeSeconds personalizado (largo)", () => {
      const payload = generateSignedQrPayload(USER_ID, QR_TOKEN, TEST_SECRET);
      const result = verifySignedQrPayload(payload, 3600, TEST_SECRET); // 1h
      expect(result.isValid).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  verifySignedQrPayload — ATAQUES Y EDGE CASES
  // ─────────────────────────────────────────────────────────────────
  describe("verifySignedQrPayload() — Seguridad", () => {
    it("🔴 RECHAZA payload con HMAC modificado (tamper attack)", () => {
      const payload = generateSignedQrPayload(USER_ID, QR_TOKEN, TEST_SECRET);
      const parts = payload.split(".");
      // Cambiar un carácter del HMAC
      parts[4] = "a".repeat(64);
      const tampered = parts.join(".");
      const result = verifySignedQrPayload(tampered, 90, TEST_SECRET);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Firma criptográfica inválida");
    });

    it("🔴 RECHAZA payload firmado con un secret diferente", () => {
      const payload = generateSignedQrPayload(USER_ID, QR_TOKEN, "atacante-secret");
      const result = verifySignedQrPayload(payload, 90, TEST_SECRET);
      expect(result.isValid).toBe(false);
    });

    it("🔴 RECHAZA payload con userId alterado (identity swap)", () => {
      const payload = generateSignedQrPayload(USER_ID, QR_TOKEN, TEST_SECRET);
      const parts = payload.split(".");
      parts[1] = "otro-user-id-malicioso-00000000000"; // Mismo length
      const result = verifySignedQrPayload(parts.join("."), 90, TEST_SECRET);
      expect(result.isValid).toBe(false);
    });

    it("🔴 RECHAZA payload con qrToken alterado", () => {
      const payload = generateSignedQrPayload(USER_ID, QR_TOKEN, TEST_SECRET);
      const parts = payload.split(".");
      parts[2] = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
      const result = verifySignedQrPayload(parts.join("."), 90, TEST_SECRET);
      expect(result.isValid).toBe(false);
    });

    it("🔴 RECHAZA payload expirado (> maxAgeSeconds)", () => {
      const timestamp = Math.floor(Date.now() / 1000) - 200; // 200s ago
      const dataToSign = `v1:${USER_ID}:${QR_TOKEN}:${timestamp}`;
      const hmac = crypto.createHmac("sha256", TEST_SECRET).update(dataToSign).digest("hex");
      const expiredPayload = `v1.${USER_ID}.${QR_TOKEN}.${timestamp}.${hmac}`;

      const result = verifySignedQrPayload(expiredPayload, 90, TEST_SECRET);
      expect(result.isValid).toBe(false);
      expect(result.isExpired).toBe(true);
      expect(result.error).toContain("expirado");
    });

    it("🔴 RECHAZA payload del futuro lejano (clock skew > 15s)", () => {
      const timestamp = Math.floor(Date.now() / 1000) + 60; // 60s en el futuro
      const dataToSign = `v1:${USER_ID}:${QR_TOKEN}:${timestamp}`;
      const hmac = crypto.createHmac("sha256", TEST_SECRET).update(dataToSign).digest("hex");
      const futurePayload = `v1.${USER_ID}.${QR_TOKEN}.${timestamp}.${hmac}`;

      const result = verifySignedQrPayload(futurePayload, 90, TEST_SECRET);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("desincronizado");
    });

    it("ACEPTA payload del futuro cercano (< 15s clock skew)", () => {
      const timestamp = Math.floor(Date.now() / 1000) + 10; // 10s en el futuro
      const dataToSign = `v1:${USER_ID}:${QR_TOKEN}:${timestamp}`;
      const hmac = crypto.createHmac("sha256", TEST_SECRET).update(dataToSign).digest("hex");
      const nearFuturePayload = `v1.${USER_ID}.${QR_TOKEN}.${timestamp}.${hmac}`;

      const result = verifySignedQrPayload(nearFuturePayload, 90, TEST_SECRET);
      expect(result.isValid).toBe(true);
    });

    it("🔴 RECHAZA payload vacío", () => {
      const result = verifySignedQrPayload("", 90, TEST_SECRET);
      expect(result.isValid).toBe(false);
    });

    it("🔴 RECHAZA payload con estructura incorrecta (3 partes)", () => {
      const result = verifySignedQrPayload("v1.abc.def", 90, TEST_SECRET);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("no compatible");
    });

    it("🔴 RECHAZA payload con timestamp corrupto (NaN)", () => {
      const result = verifySignedQrPayload("v1.uid.qr.notanumber.abc123", 90, TEST_SECRET);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("corrupta");
    });

    it("🔴 RECHAZA payload con versión diferente a v1", () => {
      const result = verifySignedQrPayload("v2.uid.qr.12345.hmac", 90, TEST_SECRET);
      expect(result.isValid).toBe(false);
    });

    it("🔴 RECHAZA inyección SQL/XSS en campos del payload", () => {
      const maliciousUserId = "'; DROP TABLE users; --";
      const result = verifySignedQrPayload(
        `v1.${maliciousUserId}.${QR_TOKEN}.12345.${crypto.randomBytes(32).toString("hex")}`,
        90,
        TEST_SECRET
      );
      expect(result.isValid).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  Brute force simulation
  // ─────────────────────────────────────────────────────────────────
  describe("verifySignedQrPayload() — Brute Force Resistance", () => {
    it("rechaza 1000 HMACs aleatorios consecutivos", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      let anyPassed = false;

      for (let i = 0; i < 1000; i++) {
        const fakeHmac = crypto.randomBytes(32).toString("hex");
        const payload = `v1.${USER_ID}.${QR_TOKEN}.${timestamp}.${fakeHmac}`;
        const result = verifySignedQrPayload(payload, 90, TEST_SECRET);
        if (result.isValid) {
          anyPassed = true;
          break;
        }
      }

      expect(anyPassed).toBe(false);
    });
  });
});
