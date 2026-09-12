"use client";

import { useTheme as useNextTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";

export const NIGHT_START_HOUR = 19; // 7:00 PM
export const NIGHT_END_HOUR = 6;    // 6:00 AM

export type ThemeMode = "light" | "dark";

export interface ScheduleSlot {
  slotId: string;
  expectedTheme: ThemeMode;
  isNight: boolean;
}

/**
 * Determina si una hora dada (0-23) corresponde al periodo nocturno (19:00 - 05:59).
 */
export function isNightHour(hour: number): boolean {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

/**
 * Calcula el slot temporal actual:
 * - Noche (ej. de 7pm del 10 Sep a 6am del 11 Sep) -> "night_2026-09-10"
 * - Día (ej. de 6am a 7pm del 11 Sep) -> "day_2026-09-11"
 */
export function getScheduleSlot(date: Date = new Date()): ScheduleSlot {
  const hours = date.getHours();
  const isNight = isNightHour(hours);
  const ref = new Date(date);

  // Si son las primeras horas de la madrugada (ej. 3 AM del día 11),
  // pertenece al bloque nocturno que inició a las 7 PM del día anterior (día 10).
  if (isNight && hours < NIGHT_END_HOUR) {
    ref.setDate(ref.getDate() - 1);
  }

  const yyyy = ref.getFullYear();
  const mm = String(ref.getMonth() + 1).padStart(2, "0");
  const dd = String(ref.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  return {
    slotId: isNight ? `night_${dateStr}` : `day_${dateStr}`,
    expectedTheme: isNight ? "dark" : "light",
    isNight,
  };
}

export const THEME_OVERRIDE_STORAGE_KEY = "presenxa_theme_override";

export interface ThemeOverride {
  slotId: string;
  theme: ThemeMode;
  timestamp: number;
}

export function getStoredOverride(): ThemeOverride | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(THEME_OVERRIDE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.slotId === "string" &&
      (parsed.theme === "light" || parsed.theme === "dark")
    ) {
      return parsed;
    }
  } catch {
    // Ignorar errores de parsing
  }
  return null;
}

export function setStoredOverride(theme: ThemeMode, slotId: string): void {
  if (typeof window === "undefined") return;
  try {
    const payload: ThemeOverride = {
      slotId,
      theme,
      timestamp: Date.now(),
    };
    localStorage.setItem(THEME_OVERRIDE_STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

export function clearStoredOverride(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(THEME_OVERRIDE_STORAGE_KEY);
  } catch {}
}

export function getEffectiveTheme(date: Date = new Date()): {
  theme: ThemeMode;
  isAuto: boolean;
  expectedTheme: ThemeMode;
  slotId: string;
} {
  const { slotId, expectedTheme } = getScheduleSlot(date);
  const override = getStoredOverride();

  if (override && override.slotId === slotId) {
    return {
      theme: override.theme,
      isAuto: override.theme === expectedTheme,
      expectedTheme,
      slotId,
    };
  }

  return {
    theme: expectedTheme,
    isAuto: true,
    expectedTheme,
    slotId,
  };
}

/**
 * Hook personalizado para interactuar con el sistema de tema programado.
 * Permite cambiar el tema manualmente o volver al horario automático.
 */
export function useThemeSchedule() {
  const { theme, setTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);
  const [scheduleState, setScheduleState] = useState<{
    theme: ThemeMode;
    isAuto: boolean;
    expectedTheme: ThemeMode;
    slotId: string;
  }>({
    theme: "light",
    isAuto: true,
    expectedTheme: "light",
    slotId: "",
  });

  const refreshState = useCallback(() => {
    const current = getEffectiveTheme();
    setScheduleState(current);
    return current;
  }, []);

  useEffect(() => {
    setMounted(true);
    refreshState();
  }, [refreshState]);

  /**
   * Alterna entre light y dark.
   * - Si el nuevo tema difiere del tema esperado según el horario, registra la anulación para este slot.
   * - Si el nuevo tema coincide con el tema esperado, limpia la anulación y reanuda el modo automático.
   */
  const toggleTheme = useCallback(() => {
    const currentEffective = getEffectiveTheme();
    const currentTheme = (theme as ThemeMode) || currentEffective.theme;
    const nextTheme: ThemeMode = currentTheme === "dark" ? "light" : "dark";
    const slot = getScheduleSlot();

    if (nextTheme === slot.expectedTheme) {
      clearStoredOverride();
    } else {
      setStoredOverride(nextTheme, slot.slotId);
    }

    setTheme(nextTheme);
    refreshState();
  }, [theme, setTheme, refreshState]);

  /**
   * Restablece el modo automático inmediatamente según el horario actual.
   */
  const resetToAuto = useCallback(() => {
    clearStoredOverride();
    const slot = getScheduleSlot();
    setTheme(slot.expectedTheme);
    refreshState();
  }, [setTheme, refreshState]);

  const isNight = mounted ? isNightHour(new Date().getHours()) : false;

  return {
    mounted,
    theme: mounted ? ((theme as ThemeMode) || scheduleState.theme) : ("light" as ThemeMode),
    isAuto: scheduleState.isAuto,
    isNight,
    expectedTheme: scheduleState.expectedTheme,
    slotId: scheduleState.slotId,
    toggleTheme,
    resetToAuto,
    refreshState,
  };
}
