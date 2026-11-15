import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { differenceInMinutes } from "date-fns";
import { buildZonedDateTime, computeOvertime } from "@/lib/dateUtils";
import {
  computeEntryDelayMinutes,
  isOvernightSchedule,
  parseShiftTimeWithOvernight,
  resolveEffectiveSchedule,
} from "@/lib/scheduleResolver";
import { uploadBufferToStorage } from "@/lib/storage";

describe("Turnos Nocturnos y Dinámicos por Empresa (Hoteles 24/7)", () => {
  it("detecta dinámicamente turnos que cruzan la medianoche", () => {
    expect(
      isOvernightSchedule({
        entryHour: 22,
        entryMinute: 0,
        exitHour: 6,
        exitMinute: 0,
      })
    ).toBe(true);

    expect(
      isOvernightSchedule({
        entryHour: 23,
        entryMinute: 45,
        exitHour: 7,
        exitMinute: 45,
      })
    ).toBe(true);

    expect(
      isOvernightSchedule({
        entryHour: 8,
        entryMinute: 0,
        exitHour: 17,
        exitMinute: 0,
      })
    ).toBe(false);
  });

  it("prioriza el turno específico del día (ShiftOverride) sobre el horario base (UserSchedule)", () => {
    const baseSchedule = {
      id: "base",
      name: "Mañana",
      workdaysMask: 31, // Lun-Vie
      entryHour: 8,
      entryMinute: 0,
      exitHour: 17,
      exitMinute: 0,
    };
    const nightOverride = {
      id: "night",
      name: "Recepción Noche",
      workdaysMask: 127,
      entryHour: 22,
      entryMinute: 0,
      exitHour: 6,
      exitMinute: 0,
    };

    // Domingo (2026-11-15) con override de turno noche asignado por el hotel
    const resolved = resolveEffectiveSchedule({
      dateStr: "2026-11-15",
      shiftOverride: { isDayOff: false, schedule: nightOverride },
      userSchedules: [{ schedule: baseSchedule }],
    });

    expect(resolved.isDayOff).toBe(false);
    expect(resolved.isOverride).toBe(true);
    expect(resolved.schedule?.id).toBe("night");

    // Domingo sin override -> día libre según workdaysMask Lun-Vie
    const resolvedDefault = resolveEffectiveSchedule({
      dateStr: "2026-11-15",
      shiftOverride: null,
      userSchedules: [{ schedule: baseSchedule }],
    });

    expect(resolvedDefault.isDayOff).toBe(true);
    expect(resolvedDefault.schedule).toBeNull();
  });

  it("calcula tardanza exacta cuando un turno nocturno inicia antes de medianoche y el empleado llega después de medianoche", () => {
    // Turno programado: Lunes 2026-11-16 a las 23:45 (Lima)
    // Empleado marca entrada: Martes 2026-11-17 a las 00:05 (Lima) -> +20 min tarde
    const arrival = buildZonedDateTime("2026-11-17", 0, 5, "America/Lima");
    const delay = computeEntryDelayMinutes(arrival, "2026-11-16", 23, 45, "America/Lima");
    expect(delay).toBe(20);

    // Llega puntual a las 23:40 del Lunes
    const earlyArrival = buildZonedDateTime("2026-11-16", 23, 40, "America/Lima");
    const earlyDelay = computeEntryDelayMinutes(earlyArrival, "2026-11-16", 23, 45, "America/Lima");
    expect(earlyDelay).toBe(-5);
  });

  it("calcula horas extras correctamente en turnos nocturnos y salidas post-medianoche", () => {
    // Caso 1: Turno noche 22:00 -> 06:00, entra Lunes 22:00 y sale Martes 06:45 -> 45 min extra
    const nightEntry = buildZonedDateTime("2026-11-16", 22, 0, "America/Lima");
    const nightExit = buildZonedDateTime("2026-11-17", 6, 45, "America/Lima");
    const otNight = computeOvertime(
      nightExit,
      { entryHour: 22, entryMinute: 0, exitHour: 6, exitMinute: 0, crossesMidnight: true },
      "America/Lima",
      15,
      nightEntry
    );
    expect(otNight).toEqual({ overtimeMinutes: 45, overtimeStatus: "PENDING" });

    // Caso 2: Turno tarde/cierre 15:00 -> 23:00, entra Lunes 15:00 y sale Martes 00:45 -> 105 min extra
    const eveningEntry = buildZonedDateTime("2026-11-16", 15, 0, "America/Lima");
    const eveningExit = buildZonedDateTime("2026-11-17", 0, 45, "America/Lima");
    const otEvening = computeOvertime(
      eveningExit,
      { entryHour: 15, entryMinute: 0, exitHour: 23, exitMinute: 0 },
      "America/Lima",
      15,
      eveningEntry
    );
    expect(otEvening).toEqual({ overtimeMinutes: 105, overtimeStatus: "PENDING" });
  });

  it("edición manual de turno nocturno suma +1 día automáticamente cuando salida <= entrada", () => {
    const baseDate = new Date("2026-11-16T00:00:00.000Z");
    const entry = parseShiftTimeWithOvernight("22:00", baseDate, null, "America/Lima");
    const exit = parseShiftTimeWithOvernight("06:00", baseDate, entry, "America/Lima");

    expect(entry).not.toBeNull();
    expect(exit).not.toBeNull();
    expect(differenceInMinutes(exit!, entry!)).toBe(480); // 8 horas exactas
  });
});

describe("Adaptador de Almacenamiento Cloud (S3/R2 + Fallback Base64)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("usa fallback Base64 transparente cuando no hay variables S3/R2 configuradas", async () => {
    const sample = Buffer.from("hello-presenxa");
    const result = await uploadBufferToStorage({
      buffer: sample,
      mimeType: "image/webp",
      extension: "webp",
      organizationId: "org-123",
      category: "kiosk-photos",
    });

    expect(result.provider).toBe("inline-base64");
    expect(result.url).toBe(`data:image/webp;base64,${sample.toString("base64")}`);
  });
});
