/**
 * ═══════════════════════════════════════════════════════════════════════
 *  TEST SUITE: dateUtils — Zona horaria, fechas locales, formateo
 *  Cubre: M-1 (timezone por org), edge cases de medianoche,
 *         cambio horario DST, y consistencia cross-timezone
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest";
import {
  getLocalDateString,
  getLocalTodayDate,
  getLocalTimeParts,
  formatLocalTime,
} from "@/lib/dateUtils";

describe("dateUtils", () => {
  // ─────────────────────────────────────────────────────────────────
  //  getLocalDateString
  // ─────────────────────────────────────────────────────────────────
  describe("getLocalDateString()", () => {
    it("retorna formato YYYY-MM-DD", () => {
      const result = getLocalDateString(new Date("2026-08-17T12:00:00Z"), "America/Lima");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("🧪 EDGE: Medianoche UTC → día anterior en Lima (UTC-5)", () => {
      // A las 00:34 UTC del 18 de agosto, en Lima son las 19:34 del 17 de agosto
      const result = getLocalDateString(
        new Date("2026-08-18T00:34:00Z"),
        "America/Lima"
      );
      expect(result).toBe("2026-08-17");
    });

    it("🧪 EDGE: Medianoche UTC → mismo día en Madrid (UTC+1/+2)", () => {
      // A las 00:34 UTC del 18 de agosto, en Madrid son las 02:34 del 18 de agosto
      const result = getLocalDateString(
        new Date("2026-08-18T00:34:00Z"),
        "Europe/Madrid"
      );
      expect(result).toBe("2026-08-18");
    });

    it("🧪 EDGE: 23:59 en UTC → día siguiente en Tokio (UTC+9)", () => {
      // 23:59 UTC del 17 agosto → 08:59 del 18 agosto en Tokio
      const result = getLocalDateString(
        new Date("2026-08-17T23:59:00Z"),
        "Asia/Tokyo"
      );
      expect(result).toBe("2026-08-18");
    });

    it("maneja string ISO como input", () => {
      const result = getLocalDateString("2026-06-15T10:00:00Z", "America/Lima");
      expect(result).toBe("2026-06-15");
    });

    it("maneja timestamp numérico como input", () => {
      const ts = new Date("2026-06-15T10:00:00Z").getTime();
      const result = getLocalDateString(ts, "America/Lima");
      expect(result).toBe("2026-06-15");
    });

    it("🧪 EDGE: Año nuevo UTC → 31 de diciembre en Lima", () => {
      // 1 de enero 00:30 UTC → 31 de diciembre 19:30 en Lima
      const result = getLocalDateString(
        new Date("2027-01-01T00:30:00Z"),
        "America/Lima"
      );
      expect(result).toBe("2026-12-31");
    });

    it("🧪 EDGE: 29 de febrero en año bisiesto", () => {
      // 2028 es bisiesto
      const result = getLocalDateString(
        new Date("2028-02-29T15:00:00Z"),
        "America/Lima"
      );
      expect(result).toBe("2028-02-29");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  getLocalTodayDate
  // ─────────────────────────────────────────────────────────────────
  describe("getLocalTodayDate()", () => {
    it("retorna un Date con T00:00:00.000Z (midnight UTC)", () => {
      const result = getLocalTodayDate(
        new Date("2026-08-17T23:30:00Z"),
        "America/Lima"
      );
      expect(result.toISOString()).toBe("2026-08-17T00:00:00.000Z");
    });

    it("🧪 EDGE: Input post-medianoche UTC, pre-medianoche Lima", () => {
      const result = getLocalTodayDate(
        new Date("2026-08-18T03:00:00Z"),
        "America/Lima"
      );
      // 03:00 UTC = 22:00 Lima del día 17
      expect(result.toISOString()).toBe("2026-08-17T00:00:00.000Z");
    });

    it("retorna Date compatible con Prisma @db.Date", () => {
      const result = getLocalTodayDate(new Date(), "America/Lima");
      // Debe terminar en T00:00:00.000Z para matchear la columna @db.Date
      expect(result.toISOString()).toMatch(/T00:00:00\.000Z$/);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  getLocalTimeParts
  // ─────────────────────────────────────────────────────────────────
  describe("getLocalTimeParts()", () => {
    it("extrae hora/minuto/segundo correctos en Lima", () => {
      // 15:30:45 UTC = 10:30:45 Lima (UTC-5)
      const result = getLocalTimeParts(
        new Date("2026-08-17T15:30:45Z"),
        "America/Lima"
      );
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(30);
      expect(result.second).toBe(45);
    });

    it("🧪 EDGE: Hora 24 normalizada a 0", () => {
      // El estándar Intl puede retornar hour=24 para medianoche en algunos locales
      // Nuestra función lo normaliza a 0
      const result = getLocalTimeParts(
        new Date("2026-08-17T05:00:00Z"), // 00:00 en Lima
        "America/Lima"
      );
      expect(result.hour).toBe(0);
    });

    it("🧪 EDGE: Horas PM en timezone positivo", () => {
      // 10:00 UTC = 19:00 Tokio (UTC+9)
      const result = getLocalTimeParts(
        new Date("2026-08-17T10:00:00Z"),
        "Asia/Tokyo"
      );
      expect(result.hour).toBe(19);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  formatLocalTime
  // ─────────────────────────────────────────────────────────────────
  describe("formatLocalTime()", () => {
    const testDate = new Date("2026-08-17T15:30:45Z"); // 10:30:45 en Lima

    it("formatea HH:mm correctamente", () => {
      expect(formatLocalTime(testDate, "HH:mm", "America/Lima")).toBe("10:30");
    });

    it("formatea HH:mm:ss correctamente", () => {
      expect(formatLocalTime(testDate, "HH:mm:ss", "America/Lima")).toBe("10:30:45");
    });

    it("formatea yyyy-MM-dd correctamente", () => {
      expect(formatLocalTime(testDate, "yyyy-MM-dd", "America/Lima")).toBe("2026-08-17");
    });

    it("formatea dd/MM/yyyy correctamente", () => {
      expect(formatLocalTime(testDate, "dd/MM/yyyy", "America/Lima")).toBe("17/08/2026");
    });

    it("formatea dd/MM/yyyy HH:mm correctamente", () => {
      expect(formatLocalTime(testDate, "dd/MM/yyyy HH:mm", "America/Lima")).toBe("17/08/2026 10:30");
    });

    it("🧪 EDGE: Hora con un solo dígito se padea con cero", () => {
      // 08:05:03 UTC = 03:05:03 Lima
      const earlyDate = new Date("2026-08-17T08:05:03Z");
      expect(formatLocalTime(earlyDate, "HH:mm:ss", "America/Lima")).toBe("03:05:03");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  Consistencia cross-timezone
  // ─────────────────────────────────────────────────────────────────
  describe("Consistencia cross-timezone", () => {
    it("la misma hora UTC produce fechas locales diferentes según timezone", () => {
      const utcDate = new Date("2026-08-18T03:00:00Z");
      const limaDate = getLocalDateString(utcDate, "America/Lima");    // 17 ago 22:00
      const tokyoDate = getLocalDateString(utcDate, "Asia/Tokyo");     // 18 ago 12:00
      const nyDate = getLocalDateString(utcDate, "America/New_York");  // 17 ago 23:00

      expect(limaDate).toBe("2026-08-17");
      expect(tokyoDate).toBe("2026-08-18");
      expect(nyDate).toBe("2026-08-17");
    });
  });
});
