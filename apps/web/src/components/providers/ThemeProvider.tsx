"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import { getEffectiveTheme } from "@/lib/themeSchedule";

function ThemeScheduleSync() {
  const { theme, setTheme } = useNextTheme();

  React.useEffect(() => {
    const checkAndSyncTheme = () => {
      const { theme: effectiveTheme } = getEffectiveTheme();
      if (effectiveTheme !== theme) {
        setTheme(effectiveTheme);
      }
    };

    // Sincronización inicial al montar
    checkAndSyncTheme();

    // Intervalo para captar la transición en tiempo real (7:00 PM y 6:00 AM)
    const interval = setInterval(checkAndSyncTheme, 10000);

    // Sincronizar al reactivar la pestaña o desbloquear el dispositivo
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndSyncTheme();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [theme, setTheme]);

  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeScheduleSync />
      {children}
    </NextThemesProvider>
  );
}
