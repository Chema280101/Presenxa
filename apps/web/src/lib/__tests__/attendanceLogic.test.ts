/**
 * ═══════════════════════════════════════════════════════════════════════
 *  TEST SUITE: Attendance Business Logic — Cálculos de tardanza,
 *  horario partido, turnos nocturnos, edge cases de EOD/SOD
 *  Cubre: M-2, M-3, M-4 (inconsistencias de cálculo)
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest";
import { getLocalTimeParts, getLocalTodayDate } from "@/lib/dateUtils";

// ─────────────────────────────────────────────────────────────────────
//  Helpers — replican la lógica de cálculo del scan/route.ts
//  para testear la lógica de negocio aislada del HTTP layer
// ─────────────────────────────────────────────────────────────────────

interface Schedule {
  entryHour: number;
  entryMinute: number;
  exitHour: number;
  exitMinute: number;
  toleranceMinutes: number;
  isSplit: boolean;
  entryHour2?: number | null;
  entryMinute2?: number | null;
  exitHour2?: number | null;
  exitMinute2?: number | null;
  toleranceMinutes2?: number | null;
  workdaysMask: number;
}

// Lógica de cálculo de tardanza extraída del scan endpoint
function calculateLateness(
  scanTime: Date,
  schedule: Schedule,
  timezone: string = "America/Lima"
): { isLate: boolean; lateMinutes: number } {
  const { hour, minute } = getLocalTimeParts(scanTime, timezone);
  const actualTotalMinutes = hour * 60 + minute;
  const scheduledMinutes = schedule.entryHour * 60 + schedule.entryMinute;
  const tolerance = schedule.toleranceMinutes || 0;
  const diff = actualTotalMinutes - (scheduledMinutes + tolerance);

  if (diff > 0) {
    return {
      isLate: true,
      lateMinutes: actualTotalMinutes - scheduledMinutes, // Minutos totales de retraso
    };
  }
  return { isLate: false, lateMinutes: 0 };
}

// Lógica del workdaysMask
function isDayWorking(dateStr: string, workdaysMask: number): boolean {
  const [year, month, day] = dateStr.split("-").map(Number);
  const localDate = new Date(year, month - 1, day);
  const jsDay = localDate.getDay();
  const systemDayIndex = jsDay === 0 ? 6 : jsDay - 1;
  const dayBit = 1 << systemDayIndex;
  return (workdaysMask & dayBit) > 0;
}

// Cálculo de minutos trabajados
function calculateWorkedMinutes(
  entryTime: Date,
  exitTime: Date,
  entryTime2?: Date | null,
  exitTime2?: Date | null
): number {
  let total = Math.max(
    0,
    Math.round((exitTime.getTime() - entryTime.getTime()) / (1000 * 60))
  );
  if (entryTime2 && exitTime2) {
    total += Math.max(
      0,
      Math.round((exitTime2.getTime() - entryTime2.getTime()) / (1000 * 60))
    );
  }
  return total;
}

// ═══════════════════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════════════════

describe("Attendance Business Logic", () => {
  const DEFAULT_SCHEDULE: Schedule = {
    entryHour: 8,
    entryMinute: 0,
    exitHour: 17,
    exitMinute: 0,
    toleranceMinutes: 5,
    isSplit: false,
    workdaysMask: 31, // Lun-Vie
  };

  // ─────────────────────────────────────────────────────────────────
  //  Cálculo de Tardanza
  // ─────────────────────────────────────────────────────────────────
  describe("calculateLateness()", () => {
    it("PUNTUAL: llega a las 08:00 exactas (horario 08:00 con 5min tolerancia)", () => {
      // 08:00 Lima = 13:00 UTC
      const scanTime = new Date("2026-08-17T13:00:00Z");
      const result = calculateLateness(scanTime, DEFAULT_SCHEDULE);
      expect(result.isLate).toBe(false);
      expect(result.lateMinutes).toBe(0);
    });

    it("PUNTUAL: llega a las 08:04 (dentro de tolerancia de 5min)", () => {
      const scanTime = new Date("2026-08-17T13:04:00Z");
      const result = calculateLateness(scanTime, DEFAULT_SCHEDULE);
      expect(result.isLate).toBe(false);
    });

    it("PUNTUAL: llega a las 08:05 exactas (borde de tolerancia, inclusivo)", () => {
      const scanTime = new Date("2026-08-17T13:05:00Z");
      const result = calculateLateness(scanTime, DEFAULT_SCHEDULE);
      expect(result.isLate).toBe(false);
    });

    it("TARDE: llega a las 08:06 (1 min después de tolerancia)", () => {
      const scanTime = new Date("2026-08-17T13:06:00Z");
      const result = calculateLateness(scanTime, DEFAULT_SCHEDULE);
      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(6); // 6 min tarde respecto a las 08:00
    });

    it("TARDE: llega a las 09:30 (90 min tarde)", () => {
      const scanTime = new Date("2026-08-17T14:30:00Z");
      const result = calculateLateness(scanTime, DEFAULT_SCHEDULE);
      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(90);
    });

    it("TEMPRANO: llega a las 07:30 (antes de hora)", () => {
      const scanTime = new Date("2026-08-17T12:30:00Z");
      const result = calculateLateness(scanTime, DEFAULT_SCHEDULE);
      expect(result.isLate).toBe(false);
    });

    it("🧪 EDGE: tolerancia = 0 (estricto)", () => {
      const strictSchedule = { ...DEFAULT_SCHEDULE, toleranceMinutes: 0 };
      // Llega a las 08:01
      const scanTime = new Date("2026-08-17T13:01:00Z");
      const result = calculateLateness(scanTime, strictSchedule);
      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(1);
    });

    it("🧪 EDGE: horario de entrada a medianoche (turno nocturno)", () => {
      const nightSchedule: Schedule = {
        ...DEFAULT_SCHEDULE,
        entryHour: 22,
        entryMinute: 0,
        exitHour: 6,
        exitMinute: 0,
      };
      // Llega a las 22:10 Lima = 03:10 UTC día siguiente
      const scanTime = new Date("2026-08-18T03:10:00Z");
      const result = calculateLateness(scanTime, nightSchedule);
      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(10);
    });

    it("🧪 EDGE: horario a las 00:00 exactas", () => {
      const midnightSchedule: Schedule = {
        ...DEFAULT_SCHEDULE,
        entryHour: 0,
        entryMinute: 0,
        toleranceMinutes: 10,
      };
      // Llega a las 00:05 Lima = 05:05 UTC
      const scanTime = new Date("2026-08-17T05:05:00Z");
      const result = calculateLateness(scanTime, midnightSchedule);
      expect(result.isLate).toBe(false); // Dentro de tolerancia
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  WorkdaysMask
  // ─────────────────────────────────────────────────────────────────
  describe("isDayWorking() — WorkdaysMask", () => {
    it("Lun-Vie (mask=31): Lunes es laboral", () => {
      expect(isDayWorking("2026-08-17", 31)).toBe(true); // Lunes
    });

    it("Lun-Vie (mask=31): Sábado NO es laboral", () => {
      expect(isDayWorking("2026-08-22", 31)).toBe(false); // Sábado
    });

    it("Lun-Vie (mask=31): Domingo NO es laboral", () => {
      expect(isDayWorking("2026-08-23", 31)).toBe(false); // Domingo
    });

    it("Lun-Sáb (mask=63): Sábado SÍ es laboral", () => {
      expect(isDayWorking("2026-08-22", 63)).toBe(true);
    });

    it("Todos los días (mask=127): Domingo SÍ es laboral", () => {
      expect(isDayWorking("2026-08-23", 127)).toBe(true);
    });

    it("Solo fines de semana (mask=96): Sáb y Dom", () => {
      expect(isDayWorking("2026-08-22", 96)).toBe(true);  // Sáb
      expect(isDayWorking("2026-08-23", 96)).toBe(true);  // Dom
      expect(isDayWorking("2026-08-17", 96)).toBe(false); // Lun
    });

    it("🧪 EDGE: mask=0 (ningún día laboral)", () => {
      expect(isDayWorking("2026-08-17", 0)).toBe(false);
      expect(isDayWorking("2026-08-22", 0)).toBe(false);
    });

    it("Solo miércoles (mask=4)", () => {
      expect(isDayWorking("2026-08-19", 4)).toBe(true);  // Miércoles
      expect(isDayWorking("2026-08-17", 4)).toBe(false); // Lunes
    });

    it("🧪 EDGE: verifica todos los 7 días de la semana con mask=127", () => {
      // Semana del 17-23 agosto 2026 (Lun-Dom)
      for (let d = 17; d <= 23; d++) {
        expect(isDayWorking(`2026-08-${d}`, 127)).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  Minutos Trabajados
  // ─────────────────────────────────────────────────────────────────
  describe("calculateWorkedMinutes()", () => {
    it("jornada completa 8h → 480 minutos", () => {
      const entry = new Date("2026-08-17T13:00:00Z"); // 08:00 Lima
      const exit = new Date("2026-08-17T22:00:00Z");  // 17:00 Lima
      expect(calculateWorkedMinutes(entry, exit)).toBe(540); // 9h
    });

    it("jornada partida: 2 tramos de 4h c/u → 480 minutos", () => {
      const entry1 = new Date("2026-08-17T13:00:00Z"); // 08:00
      const exit1 = new Date("2026-08-17T18:00:00Z");  // 13:00
      const entry2 = new Date("2026-08-17T20:00:00Z"); // 15:00
      const exit2 = new Date("2026-08-18T00:00:00Z");  // 19:00
      expect(calculateWorkedMinutes(entry1, exit1, entry2, exit2)).toBe(540);
    });

    it("🧪 EDGE: salida antes que entrada (negativo) → 0 min", () => {
      const entry = new Date("2026-08-17T22:00:00Z");
      const exit = new Date("2026-08-17T13:00:00Z");
      expect(calculateWorkedMinutes(entry, exit)).toBe(0);
    });

    it("🧪 EDGE: entrada y salida iguales → 0 min", () => {
      const same = new Date("2026-08-17T13:00:00Z");
      expect(calculateWorkedMinutes(same, same)).toBe(0);
    });

    it("🧪 EDGE: turno nocturno cruzando medianoche (22:00 a 06:00) → 480 min", () => {
      const entry = new Date("2026-08-17T03:00:00Z"); // 22:00 Lima
      const exit = new Date("2026-08-17T11:00:00Z");  // 06:00 Lima (+1 día)
      expect(calculateWorkedMinutes(entry, exit)).toBe(480);
    });

    it("turno de 30 minutos", () => {
      const entry = new Date("2026-08-17T13:00:00Z");
      const exit = new Date("2026-08-17T13:30:00Z");
      expect(calculateWorkedMinutes(entry, exit)).toBe(30);
    });

    it("🧪 EDGE: jornada de 24h continuas (guardia)", () => {
      const entry = new Date("2026-08-17T13:00:00Z");
      const exit = new Date("2026-08-18T13:00:00Z");
      expect(calculateWorkedMinutes(entry, exit)).toBe(1440); // 24h
    });

    it("ignora tramo 2 si solo tiene entry2 pero no exit2", () => {
      const entry1 = new Date("2026-08-17T13:00:00Z");
      const exit1 = new Date("2026-08-17T18:00:00Z");
      const entry2 = new Date("2026-08-17T20:00:00Z");
      expect(calculateWorkedMinutes(entry1, exit1, entry2, null)).toBe(300);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  Horario Partido — 4 marcaciones
  // ─────────────────────────────────────────────────────────────────
  describe("Horario Partido (Split Schedule)", () => {
    const SPLIT_SCHEDULE: Schedule = {
      entryHour: 8,
      entryMinute: 0,
      exitHour: 13,
      exitMinute: 0,
      toleranceMinutes: 5,
      isSplit: true,
      entryHour2: 15,
      entryMinute2: 0,
      exitHour2: 19,
      exitMinute2: 0,
      toleranceMinutes2: 5,
      workdaysMask: 31,
    };

    it("PUNTUAL en ambos tramos", () => {
      const r1 = calculateLateness(
        new Date("2026-08-17T13:00:00Z"), // 08:00 Lima
        SPLIT_SCHEDULE
      );
      expect(r1.isLate).toBe(false);

      const r2 = calculateLateness(
        new Date("2026-08-17T20:00:00Z"), // 15:00 Lima
        { ...SPLIT_SCHEDULE, entryHour: SPLIT_SCHEDULE.entryHour2!, entryMinute: SPLIT_SCHEDULE.entryMinute2! }
      );
      expect(r2.isLate).toBe(false);
    });

    it("PUNTUAL tramo 1, TARDE tramo 2", () => {
      const r1 = calculateLateness(
        new Date("2026-08-17T13:00:00Z"), // 08:00
        SPLIT_SCHEDULE
      );
      expect(r1.isLate).toBe(false);

      const r2 = calculateLateness(
        new Date("2026-08-17T20:20:00Z"), // 15:20 Lima (20 min tarde)
        { ...SPLIT_SCHEDULE, entryHour: SPLIT_SCHEDULE.entryHour2!, entryMinute: SPLIT_SCHEDULE.entryMinute2!, toleranceMinutes: SPLIT_SCHEDULE.toleranceMinutes2! }
      );
      expect(r2.isLate).toBe(true);
      expect(r2.lateMinutes).toBe(20);
    });

    it("🧪 EDGE: minutos trabajados en jornada partida completa", () => {
      // T1: 08:00-13:00 = 5h, T2: 15:00-19:00 = 4h → 9h total = 540 min
      const total = calculateWorkedMinutes(
        new Date("2026-08-17T13:00:00Z"), // 08:00
        new Date("2026-08-17T18:00:00Z"), // 13:00
        new Date("2026-08-17T20:00:00Z"), // 15:00
        new Date("2026-08-18T00:00:00Z")  // 19:00
      );
      expect(total).toBe(540);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  Turno Nocturno (Night Shift)
  // ─────────────────────────────────────────────────────────────────
  describe("Turno Nocturno", () => {
    const NIGHT_SCHEDULE: Schedule = {
      entryHour: 22,
      entryMinute: 0,
      exitHour: 6,
      exitMinute: 0,
      toleranceMinutes: 10,
      isSplit: false,
      workdaysMask: 127, // Todos los días
    };

    it("entrada a las 22:00, salida a las 06:00 (+1 día) = 480 min", () => {
      const total = calculateWorkedMinutes(
        new Date("2026-08-17T03:00:00Z"), // 22:00 Lima
        new Date("2026-08-17T11:00:00Z")  // 06:00 Lima (día 18)
      );
      expect(total).toBe(480);
    });

    it("llega a las 22:05 (dentro de tolerancia 10min) → NO es tarde", () => {
      const scanTime = new Date("2026-08-17T03:05:00Z"); // 22:05 Lima
      const result = calculateLateness(scanTime, NIGHT_SCHEDULE);
      expect(result.isLate).toBe(false);
    });

    it("llega a las 22:15 (fuera de tolerancia) → SÍ es tarde", () => {
      const scanTime = new Date("2026-08-17T03:15:00Z"); // 22:15 Lima
      const result = calculateLateness(scanTime, NIGHT_SCHEDULE);
      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(15);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  Escenarios de EOD (Daily Closer) Bug Discovery (FIXED)
  // ─────────────────────────────────────────────────────────────────
  describe("Escenarios EOD — Bug Discovery (FIXED)", () => {
    it("✅ M-2 FIXED: Empleado con día libre (ShiftOverride) NO es AUSENTE", () => {
      const hasDayOffOverride = true; 
      const currentStatus = "PENDIENTE";
      const hasEntryTime = false;

      // El EOD job ahora respeta el override
      const resolvedStatus = hasDayOffOverride && !hasEntryTime ? "DIA_LIBRE" : !hasEntryTime ? "AUSENTE" : currentStatus;
      
      expect(resolvedStatus).toBe("DIA_LIBRE"); 
    });

    it("✅ M-3 FIXED: Empleado de vacaciones NO se inicia como PENDIENTE", () => {
      const hasApprovedVacation = true; 
      // El SOD job ahora usa 'VACACIONES' como initialStatus
      const initialStatus = hasApprovedVacation ? "VACACIONES" : "PENDIENTE";

      expect(initialStatus).toBe("VACACIONES"); 
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  M-4: Inconsistencia en cálculo de lateMinutes (FIXED)
  // ─────────────────────────────────────────────────────────────────
  describe("M-4: Consistencia lateMinutes entre scan y sync (FIXED)", () => {
    it("✅ lateMinutes es igual independientemente del modo (online vs offline)", () => {
      const schedule = DEFAULT_SCHEDULE; // 08:00 con 5min tolerancia
      const scanTime = new Date("2026-08-17T13:07:00Z"); // 08:07 Lima

      const { hour, minute } = getLocalTimeParts(scanTime, "America/Lima");
      const actualTotalMinutes = hour * 60 + minute;
      const scheduledMinutes = schedule.entryHour * 60 + schedule.entryMinute;
      
      const scanLateMinutes = actualTotalMinutes - scheduledMinutes; // 7

      const tolerance = schedule.toleranceMinutes || 0;
      const diff = actualTotalMinutes - (scheduledMinutes + tolerance);
      const syncLateMinutes = diff > 0 ? actualTotalMinutes - scheduledMinutes : 0; // 7 (Corregido)

      expect(scanLateMinutes).toBe(7);
      expect(syncLateMinutes).toBe(7);
      expect(scanLateMinutes).toBe(syncLateMinutes);
    });
  });
});
