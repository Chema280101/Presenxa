"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeSchedule } from "@/lib/themeSchedule";

function getThemeTooltip(isAuto: boolean, theme: string | undefined): string {
  if (isAuto) {
    return theme === "dark"
      ? "Modo oscuro automático (7:00 PM - 6:00 AM) • Clic para cambiar a claro"
      : "Modo claro automático (6:00 AM - 7:00 PM) • Clic para cambiar a oscuro";
  }
  const modeLabel = theme === "dark" ? "Oscuro" : "Claro";
  return `Modo manual: ${modeLabel} • Clic para alternar / restaurar automático`;
}

export function ThemeToggle() {
  const { theme, toggleTheme, isAuto, mounted } = useThemeSchedule();

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Cargando tema"
        className="relative min-w-11 min-h-11 sm:min-w-9 sm:min-h-9 flex items-center justify-center rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-400"
      >
        <Sun className="h-4 w-4 opacity-0" aria-hidden="true" />
      </button>
    );
  }

  const tooltip = getThemeTooltip(isAuto, theme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative min-w-11 min-h-11 sm:min-w-9 sm:min-h-9 flex items-center justify-center rounded-xl bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 transition-colors cursor-pointer"
      title={tooltip}
      aria-label={tooltip}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" aria-hidden="true" />
      <Moon className="absolute inset-0 m-auto h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-indigo-400" aria-hidden="true" />
    </button>
  );
}
