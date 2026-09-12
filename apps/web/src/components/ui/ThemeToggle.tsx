"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeSchedule } from "@/lib/themeSchedule";

export function ThemeToggle() {
  const { theme, toggleTheme, isAuto, isNight, mounted } = useThemeSchedule();

  if (!mounted) {
    return (
      <button
        aria-label="Cargando tema"
        className="relative p-2 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-400"
      >
        <Sun className="h-4 w-4 opacity-0" />
      </button>
    );
  }

  const tooltip = isAuto
    ? theme === "dark"
      ? "Modo oscuro automático (7:00 PM - 6:00 AM) • Clic para cambiar a claro"
      : "Modo claro automático (6:00 AM - 7:00 PM) • Clic para cambiar a oscuro"
    : `Modo manual: ${theme === "dark" ? "Oscuro" : "Claro"} • Clic para alternar / restaurar automático`;

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-xl bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 transition-colors cursor-pointer"
      title={tooltip}
      aria-label={tooltip}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
      <Moon className="absolute h-4 w-4 top-2 left-2 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-indigo-400" />
    </button>
  );
}
