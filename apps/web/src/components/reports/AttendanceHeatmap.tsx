"use client";

import { useState, useMemo } from "react";
import {
  Flame,
  Clock,
  LogOut,
  AlertTriangle,
  Building,
  TrendingUp,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight,
  Sun,
  Moon,
  Info,
} from "lucide-react";

export type HeatmapMode = "ENTRIES" | "EXITS" | "LATES" | "ABSENTEEISM";

interface PeakHourCell {
  dayOfWeek: number;
  dayName: string;
  hour: number;
  entries: number;
  exits: number;
  lates: number;
  onTime: number;
  totalTraffic: number;
  avgLateMinutes: number;
}

interface LocationPattern {
  id: string;
  name: string;
  totalRecords: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  abandonedCount: number;
  absenteeismRate: number;
  lateRate: number;
  punctualityRate: number;
  daysBreakdown: Record<number, { present: number; late: number; absent: number; total: number }>;
}

interface RolePattern {
  role: string;
  totalRecords: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  abandonedCount: number;
  absenteeismRate: number;
  lateRate: number;
  punctualityRate: number;
  daysBreakdown: Record<number, { present: number; late: number; absent: number; total: number }>;
}

interface HeatmapInsights {
  busiestDay: string;
  peakEntryWindow: string;
  peakEntryDay: string;
  peakEntryCount: number;
  peakExitWindow: string;
  peakExitDay: string;
  peakExitCount: number;
  criticalLateDay: string;
  criticalLateWindow: string;
  criticalLateCount: number;
  highestAbsentLocation: string;
  totalEntries: number;
  totalExits: number;
  totalLates: number;
  totalUsers: number;
}

interface AttendanceHeatmapProps {
  matrix: PeakHourCell[];
  locationPatterns: LocationPattern[];
  rolePatterns: RolePattern[];
  insights: HeatmapInsights;
  isLoading?: boolean;
}

export function AttendanceHeatmap({
  matrix,
  locationPatterns,
  rolePatterns,
  insights,
  isLoading = false,
}: AttendanceHeatmapProps) {
  const [activeMode, setActiveMode] = useState<HeatmapMode>("ENTRIES");
  const [timeRangeMode, setTimeRangeMode] = useState<"WORK" | "FULL">("WORK");
  const [hoveredCell, setHoveredCell] = useState<{
    dayName: string;
    hour: number;
    value: number;
    sub: string;
    extra?: string;
    lateCount?: number;
    onTimeCount?: number;
  } | null>(null);

  // Días de lunes a domingo para orden laboral intuitivo (1: Lunes -> 6: Sábado -> 0: Domingo)
  const orderedDays = [
    { id: 1, name: "Lunes", short: "Lun" },
    { id: 2, name: "Martes", short: "Mar" },
    { id: 3, name: "Miércoles", short: "Mié" },
    { id: 4, name: "Jueves", short: "Jue" },
    { id: 5, name: "Viernes", short: "Vie" },
    { id: 6, name: "Sábado", short: "Sáb" },
    { id: 0, name: "Domingo", short: "Dom" },
  ];

  // Rango de horas a visualizar: 06:00 a 21:00 (16 horas laborales) o 00:00 a 23:00 (24h completas)
  const displayedHours = useMemo(() => {
    if (timeRangeMode === "FULL") {
      return Array.from({ length: 24 }, (_, i) => i);
    }
    return Array.from({ length: 16 }, (_, i) => i + 6); // 6 to 21
  }, [timeRangeMode]);

  // Encontrar valor máximo para escala de color según el modo
  const maxVal = useMemo(() => {
    if (!matrix || matrix.length === 0) return 1;
    if (activeMode === "ENTRIES") return Math.max(1, ...matrix.map((c) => c.entries));
    if (activeMode === "EXITS") return Math.max(1, ...matrix.map((c) => c.exits));
    if (activeMode === "LATES") return Math.max(1, ...matrix.map((c) => c.lates));
    return 100;
  }, [matrix, activeMode]);

  // Total por día para la columna de resumen
  const dayRowTotals = useMemo(() => {
    const map: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };
    if (!matrix) return map;
    matrix.forEach((c) => {
      const v = activeMode === "ENTRIES" ? c.entries : activeMode === "EXITS" ? c.exits : c.lates;
      map[c.dayOfWeek] = (map[c.dayOfWeek] || 0) + v;
    });
    return map;
  }, [matrix, activeMode]);

  // Total por hora para la fila de resumen inferior
  const hourColTotals = useMemo(() => {
    const map: Record<number, number> = {};
    displayedHours.forEach((h) => (map[h] = 0));
    if (!matrix) return map;
    matrix.forEach((c) => {
      if (map[c.hour] !== undefined) {
        const v = activeMode === "ENTRIES" ? c.entries : activeMode === "EXITS" ? c.exits : c.lates;
        map[c.hour] = (map[c.hour] || 0) + v;
      }
    });
    return map;
  }, [matrix, displayedHours, activeMode]);

  const maxHourTotal = useMemo(() => {
    return Math.max(1, ...Object.values(hourColTotals));
  }, [hourColTotals]);

  // Generador de colores estético y consistente con soporte perfecto para Light y Dark Mode
  const getCellColor = (val: number, isZero: boolean) => {
    if (isZero || val === 0) {
      return "bg-surface-100 dark:bg-surface-800/40 border-surface-200/80 dark:border-surface-700/40 text-surface-400 dark:text-surface-600 hover:bg-surface-200/70 dark:hover:bg-surface-700/50 hover:border-surface-300 dark:hover:border-surface-600";
    }

    const intensity = Math.min(1, val / maxVal);

    if (activeMode === "ENTRIES") {
      if (intensity < 0.25) {
        return "bg-primary-100 dark:bg-primary-950/70 border-primary-300/80 dark:border-primary-500/30 text-primary-800 dark:text-primary-300 hover:border-primary-400";
      }
      if (intensity < 0.5) {
        return "bg-primary-200 dark:bg-primary-700/80 border-primary-400 dark:border-primary-400/50 text-primary-950 dark:text-primary-100 hover:border-primary-500 font-bold";
      }
      if (intensity < 0.8) {
        return "bg-primary-500 dark:bg-primary-500 text-white dark:text-surface-950 border-primary-600 dark:border-primary-300 font-black shadow-sm shadow-primary-500/20";
      }
      return "bg-primary-600 dark:bg-primary-400 text-white dark:text-surface-950 border-primary-700 dark:border-primary-200 font-black shadow-md shadow-primary-600/30 dark:shadow-primary-400/50 ring-2 ring-primary-500/40 animate-pulse";
    }

    if (activeMode === "EXITS") {
      if (intensity < 0.25) {
        return "bg-info-100 dark:bg-sky-950/70 border-info-300 dark:border-sky-500/30 text-info-800 dark:text-sky-300 hover:border-info-400";
      }
      if (intensity < 0.5) {
        return "bg-info-200 dark:bg-sky-700/80 border-info-400 dark:border-sky-400/50 text-info-950 dark:text-sky-100 hover:border-info-500 font-bold";
      }
      if (intensity < 0.8) {
        return "bg-info-500 dark:bg-sky-500 text-white dark:text-surface-950 border-info-600 dark:border-sky-300 font-black shadow-sm shadow-info-500/20";
      }
      return "bg-info-600 dark:bg-cyan-400 text-white dark:text-surface-950 border-info-700 dark:border-cyan-200 font-black shadow-md shadow-info-600/30 dark:shadow-cyan-400/50 ring-2 ring-info-400/40 animate-pulse";
    }

    if (activeMode === "LATES") {
      if (intensity < 0.25) {
        return "bg-warning-100 dark:bg-amber-950/70 border-warning-300 dark:border-amber-500/30 text-warning-800 dark:text-amber-300 hover:border-warning-400";
      }
      if (intensity < 0.5) {
        return "bg-warning-200 dark:bg-amber-700/80 border-warning-400 dark:border-amber-400/50 text-warning-950 dark:text-amber-100 hover:border-warning-500 font-bold";
      }
      if (intensity < 0.8) {
        return "bg-warning-500 dark:bg-amber-500 text-white dark:text-surface-950 border-warning-600 dark:border-amber-300 font-black shadow-sm shadow-warning-500/20";
      }
      return "bg-warning-600 dark:bg-orange-500 text-white dark:text-surface-950 border-warning-700 dark:border-orange-300 font-black shadow-md shadow-warning-600/30 dark:shadow-orange-500/50 ring-2 ring-warning-400/40";
    }

    return "bg-primary-500/20 border-primary-500/30 text-surface-900 dark:text-white";
  };

  const gridTemplateStyle = {
    gridTemplateColumns: `72px repeat(${displayedHours.length}, minmax(0, 1fr)) 64px`,
  };

  return (
    <div className="bg-white dark:bg-surface-900 p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-surface-200 dark:border-surface-800 space-y-6 shadow-sm relative overflow-hidden transition-colors">
      {/* Background soft ambient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 blur-3xl pointer-events-none" />

      {/* Top Header & Mode Selectors */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-surface-200 dark:border-surface-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-2xl bg-primary-50 dark:bg-primary-500/15 border border-primary-200 dark:border-primary-500/30 text-primary-600 dark:text-primary-400 shadow-sm">
              <Flame className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-surface-900 dark:text-white tracking-tight">
              Mapas de Calor y Horas Pico
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-500/25 text-[11px] font-bold">
              Analítica Visual
            </span>
          </div>
          <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-400 max-w-2xl leading-relaxed">
            Visualiza en tiempo real los patrones de concurrencia, cuellos de botella de entrada y puntos críticos de retraso o ausentismo.
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-100 dark:bg-surface-950 rounded-2xl border border-surface-200 dark:border-surface-800 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveMode("ENTRIES")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeMode === "ENTRIES"
                ? "bg-primary-600 dark:bg-primary-500 text-white font-bold shadow-sm shadow-primary-500/20"
                : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Picos de Entrada</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("EXITS")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeMode === "EXITS"
                ? "bg-info-600 dark:bg-info-500 text-white font-bold shadow-sm shadow-info-500/20"
                : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white"
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Picos de Salida</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("LATES")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeMode === "LATES"
                ? "bg-warning-600 dark:bg-warning-500 text-white font-bold shadow-sm shadow-warning-500/20"
                : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Tardanzas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("ABSENTEEISM")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeMode === "ABSENTEEISM"
                ? "bg-danger-600 dark:bg-danger-500 text-white font-bold shadow-sm shadow-danger-500/20"
                : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Ausentismo por Sede</span>
          </button>
        </div>
      </div>

      {/* ── Executive Insights Strip ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700/80 flex items-center gap-3 shadow-sm hover:border-primary-400/40 transition-all">
          <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-surface-500 dark:text-surface-400 block font-semibold uppercase tracking-wider">HORA PICO DE INGRESO</span>
            <strong className="text-surface-900 dark:text-white text-sm font-extrabold truncate block">
              {insights.peakEntryCount > 0 && insights.peakEntryWindow ? insights.peakEntryWindow : "--:--"}
            </strong>
            <span className="text-[11px] text-surface-600 dark:text-surface-400 font-medium">
              {insights.peakEntryCount > 0
                ? `${insights.peakEntryDay} (${insights.peakEntryCount} ingresos)`
                : "Sin ingresos registrados"}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700/80 flex items-center gap-3 shadow-sm hover:border-info-400/40 transition-all">
          <div className="p-2.5 rounded-xl bg-info-50 dark:bg-info-500/10 text-info-600 dark:text-info-400 border border-info-200 dark:border-info-500/20 shrink-0">
            <LogOut className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-surface-500 dark:text-surface-400 block font-semibold uppercase tracking-wider">HORA PICO DE SALIDA</span>
            <strong className="text-surface-900 dark:text-white text-sm font-extrabold truncate block">
              {insights.peakExitCount > 0 && insights.peakExitWindow ? insights.peakExitWindow : "--:--"}
            </strong>
            <span className="text-[11px] text-surface-600 dark:text-surface-400 font-medium">
              {insights.peakExitCount > 0
                ? `${insights.peakExitDay} (${insights.peakExitCount} salidas)`
                : "Sin salidas registradas"}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700/80 flex items-center gap-3 shadow-sm hover:border-warning-400/40 transition-all">
          <div className="p-2.5 rounded-xl bg-warning-50 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400 border border-warning-200 dark:border-warning-500/20 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-surface-500 dark:text-surface-400 block font-semibold uppercase tracking-wider">FRANJA CRÍTICA TARDANZAS</span>
            <strong className="text-surface-900 dark:text-white text-sm font-extrabold truncate block">
              {insights.criticalLateCount > 0 && insights.criticalLateWindow ? insights.criticalLateWindow : "--:--"}
            </strong>
            <span className="text-[11px] text-surface-600 dark:text-surface-400 font-medium">
              {insights.criticalLateCount > 0
                ? `${insights.criticalLateDay} (${insights.criticalLateCount} retrasos)`
                : "Sin tardanzas registradas"}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700/80 flex items-center gap-3 shadow-sm hover:border-primary-400/40 transition-all">
          <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-surface-500 dark:text-surface-400 block font-semibold uppercase tracking-wider">DÍA DE MAYOR AFLUENCIA</span>
            <strong className="text-surface-900 dark:text-white text-sm font-extrabold truncate block">
              {insights.totalEntries > 0 ? insights.busiestDay : "--"}
            </strong>
            <span className="text-[11px] text-surface-600 dark:text-surface-400 font-medium">
              {insights.totalEntries > 0
                ? `${insights.totalEntries} marcaciones totales`
                : "0 marcaciones totales"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Heatmap Grid (Peak Hours / Lates) ────────────────── */}
      {activeMode !== "ABSENTEEISM" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-surface-600 dark:text-surface-400 flex items-center gap-2">
              <span className="font-bold text-surface-900 dark:text-white text-sm">
                {activeMode === "ENTRIES"
                  ? "Densidad de Ingresos (Día vs. Hora)"
                  : activeMode === "EXITS"
                  ? "Densidad de Salidas (Día vs. Hora)"
                  : "Concentración de Tardanzas por Franja Horaria"}
              </span>
              <span className="text-surface-300 dark:text-surface-700 hidden sm:inline">•</span>
              <span className="text-[11px] text-surface-500 dark:text-surface-400 hidden sm:inline">Pasa el cursor sobre cualquier casilla</span>
            </div>

            {/* Time range toggle: Work Hours (06h-21h) vs Full 24 Hours */}
            <div className="flex items-center gap-1 p-1 bg-surface-100 dark:bg-surface-800/80 rounded-xl border border-surface-200 dark:border-surface-700/80 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setTimeRangeMode("WORK")}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                  timeRangeMode === "WORK"
                    ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white font-bold shadow-sm"
                    : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white"
                }`}
              >
                Jornada (06h - 21h)
              </button>
              <button
                type="button"
                onClick={() => setTimeRangeMode("FULL")}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                  timeRangeMode === "FULL"
                    ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white font-bold shadow-sm"
                    : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white"
                }`}
              >
                24 Horas
              </button>
            </div>
          </div>

          {/* Heatmap Matrix Table Wrapper */}
          <div className="overflow-x-auto pb-3 pt-1">
            <div className="min-w-[840px] space-y-1.5">
              {/* Hours Header Row */}
              <div
                className="grid gap-1 text-[11px] font-mono text-surface-500 dark:text-surface-400 text-center mb-2 items-center"
                style={gridTemplateStyle}
              >
                <div className="text-left font-sans font-bold text-surface-500 dark:text-surface-400 pl-1 text-xs">DÍA</div>
                {displayedHours.map((h) => (
                  <div
                    key={h}
                    className="py-1 px-0.5 rounded-lg bg-surface-100 dark:bg-surface-800/60 text-surface-600 dark:text-surface-300 text-[10px] sm:text-[11px] font-semibold border border-surface-200 dark:border-surface-700/60"
                  >
                    {String(h).padStart(2, "0")}h
                  </div>
                ))}
                <div className="text-right font-sans font-bold text-surface-500 dark:text-surface-400 pr-1 text-[11px]">TOTAL</div>
              </div>

              {/* Day Rows */}
              {orderedDays.map((day) => (
                <div
                  key={day.id}
                  className="grid gap-1 items-center"
                  style={gridTemplateStyle}
                >
                  {/* Day Label */}
                  <div className="text-xs font-semibold text-surface-700 dark:text-surface-200 pl-1 text-left flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-primary-400" />
                    <span>{day.name}</span>
                  </div>

                  {/* Hour Cells */}
                  {displayedHours.map((hour) => {
                    const cell = matrix?.find((c) => c.dayOfWeek === day.id && c.hour === hour);
                    const val =
                      activeMode === "ENTRIES"
                        ? cell?.entries || 0
                        : activeMode === "EXITS"
                        ? cell?.exits || 0
                        : cell?.lates || 0;

                    const isZero = val === 0;
                    const cellColorClass = getCellColor(val, isZero);

                    return (
                      <div
                        key={hour}
                        onMouseEnter={() =>
                          setHoveredCell({
                            dayName: day.name,
                            hour,
                            value: val,
                            sub:
                              activeMode === "ENTRIES"
                                ? `${cell?.onTime || 0} puntuales · ${cell?.lates || 0} tardes`
                                : activeMode === "EXITS"
                                ? `Salidas de jornada registradas`
                                : `Retraso promedio: +${cell?.avgLateMinutes || 0} min`,
                            extra:
                              cell && cell.entries > 0 && insights.totalEntries > 0
                                ? `${Math.round((val / insights.totalEntries) * 100)}% del total`
                                : undefined,
                            lateCount: cell?.lates || 0,
                            onTimeCount: cell?.onTime || 0,
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`h-9 rounded-xl border flex items-center justify-center text-xs font-mono transition-all duration-200 cursor-pointer hover:scale-110 hover:z-20 relative group select-none ${cellColorClass}`}
                      >
                        {val > 0 ? (
                          <span className="font-extrabold">{val}</span>
                        ) : (
                          <span className="opacity-25 text-[10px]">•</span>
                        )}
                      </div>
                    );
                  })}

                  {/* Row Day Total */}
                  <div className="text-right pr-1 font-mono text-xs font-bold text-surface-700 dark:text-surface-300">
                    {dayRowTotals[day.id] || 0}
                  </div>
                </div>
              ))}

              {/* Bottom Hour Volume Mini-Histogram */}
              <div
                className="grid gap-1 items-end pt-3 mt-2 border-t border-surface-200 dark:border-surface-800"
                style={gridTemplateStyle}
              >
                <div className="text-[10px] font-sans font-semibold text-surface-500 dark:text-surface-400 pl-1">
                  VOLUMEN
                </div>
                {displayedHours.map((h) => {
                  const total = hourColTotals[h] || 0;
                  const barHeightPercent = Math.max(8, Math.round((total / maxHourTotal) * 100));

                  return (
                    <div key={h} className="flex flex-col items-center gap-1 group">
                      <div className="w-full h-8 flex items-end justify-center rounded bg-surface-100 dark:bg-surface-800/60 p-0.5 border border-surface-200/60 dark:border-surface-700/40">
                        <div
                          className={`w-full rounded-sm transition-all ${
                            total > 0
                              ? activeMode === "ENTRIES"
                                ? "bg-primary-500"
                                : activeMode === "EXITS"
                                ? "bg-info-500"
                                : "bg-warning-500"
                              : "bg-surface-200 dark:bg-surface-700/40"
                          }`}
                          style={{ height: `${total > 0 ? barHeightPercent : 0}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-surface-500 dark:text-surface-400 group-hover:text-surface-900 dark:group-hover:text-white font-semibold">
                        {total}
                      </span>
                    </div>
                  );
                })}
                <div className="text-right pr-1 font-mono text-xs font-black text-primary-600 dark:text-primary-400">
                  {insights.totalEntries || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Floating Hover Card Detail & Color Legend */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-surface-200 dark:border-surface-800">
            {hoveredCell ? (
              <div className="flex-1 p-3 rounded-2xl bg-surface-50 dark:bg-surface-950 border border-primary-500/40 shadow-md flex items-center justify-between text-xs animate-scale-up">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30 font-bold font-mono text-sm">
                    {String(hoveredCell.hour).padStart(2, "0")}:00 - {String(hoveredCell.hour + 1).padStart(2, "0")}:00
                  </div>
                  <div>
                    <h4 className="font-extrabold text-surface-900 dark:text-white text-sm">
                      {hoveredCell.dayName}
                    </h4>
                    <p className="text-surface-600 dark:text-surface-300 text-xs mt-0.5">{hoveredCell.sub}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-mono font-black text-primary-600 dark:text-primary-400">
                    {hoveredCell.value}
                  </span>
                  <span className="text-surface-500 dark:text-surface-400 block text-[10px] uppercase font-bold">
                    {activeMode === "ENTRIES" ? "Ingresos" : activeMode === "EXITS" ? "Salidas" : "Tardanzas"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-surface-500 dark:text-surface-400 flex items-center gap-2">
                <Info className="w-4 h-4 text-surface-400 dark:text-surface-500 shrink-0" />
                <span>Pasa el cursor sobre cualquier casilla para inspeccionar métricas exactas.</span>
              </div>
            )}

            {/* Color Legend */}
            <div className="flex items-center gap-2 text-[11px] text-surface-600 dark:text-surface-400 shrink-0 self-end sm:self-auto">
              <span className="font-semibold text-surface-700 dark:text-surface-300">Intensidad:</span>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-md bg-surface-100 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-700" />
                  <span>0</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-md bg-primary-100 dark:bg-primary-950/70 border border-primary-300 dark:border-primary-500/30" />
                  <span>Baja</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-md bg-primary-200 dark:bg-primary-700/80 border border-primary-400 dark:border-primary-400/40" />
                  <span>Media</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-md bg-primary-500 border border-primary-600 dark:border-primary-300" />
                  <span>Alta</span>
                </span>
                <span className="flex items-center gap-1 font-bold text-primary-600 dark:text-primary-400">
                  <span className="w-3.5 h-3.5 rounded-md bg-primary-600 dark:bg-primary-400 border border-primary-700 dark:border-primary-200 shadow-sm" />
                  <span>Pico 🔥</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Absenteeism Patterns by Location & Department ─────────── */
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-surface-900 dark:text-white mb-1">
              Patrones de Inasistencia y Tardanzas por Sede
            </h3>
            <p className="text-xs text-surface-600 dark:text-surface-400">
              Comportamiento semanal por ubicación para detectar departamentos o sedes con mayor deserción.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locationPatterns.map((loc) => (
              <div
                key={loc.id}
                className="p-5 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700/80 space-y-4 hover:border-primary-300 dark:hover:border-primary-500/30 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-surface-900 dark:text-white">{loc.name}</h4>
                      <span className="text-[11px] text-surface-500 dark:text-surface-400">{loc.totalRecords} asistencias procesadas</span>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold font-mono border ${
                      loc.absenteeismRate > 10
                        ? "bg-danger-50 dark:bg-danger-500/20 text-danger-700 dark:text-danger-300 border-danger-200 dark:border-danger-500/30"
                        : "bg-primary-50 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-500/30"
                    }`}
                  >
                    {loc.absenteeismRate}% Ausentismo
                  </span>
                </div>

                {/* Day of Week Absenteeism Bar */}
                <div className="grid grid-cols-7 gap-1.5 text-center font-mono">
                  {orderedDays.map((d) => {
                    const dayData = loc.daysBreakdown[d.id] || { present: 0, late: 0, absent: 0, total: 0 };
                    const rate = dayData.total ? Math.round((dayData.absent / dayData.total) * 100) : 0;

                    return (
                      <div key={d.id} className="space-y-1.5">
                        <span className="text-[10px] text-surface-500 dark:text-surface-400 font-sans font-bold block">{d.short}</span>
                        <div
                          className={`h-9 rounded-xl flex items-center justify-center text-xs font-bold border transition-all ${
                            rate === 0
                              ? "bg-surface-100 dark:bg-surface-900/60 border-surface-200 dark:border-surface-700/60 text-surface-400 dark:text-surface-500"
                              : rate < 10
                              ? "bg-primary-100 dark:bg-primary-950/70 text-primary-800 dark:text-primary-300 border-primary-300 dark:border-primary-500/30"
                              : rate < 25
                              ? "bg-warning-100 dark:bg-warning-950/70 text-warning-800 dark:text-warning-300 border-warning-300 dark:border-warning-500/30"
                              : "bg-danger-500 text-white border-danger-600 shadow-sm"
                          }`}
                          title={`${d.name}: ${dayData.absent} inasistencias de ${dayData.total}`}
                        >
                          {rate > 0 ? `${rate}%` : "0%"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-xs text-surface-600 dark:text-surface-300 pt-2 border-t border-surface-200 dark:border-surface-700/60 font-mono">
                  <span>Puntualidad: <strong className="text-primary-600 dark:text-primary-400 font-bold">{loc.punctualityRate}%</strong></span>
                  <span>Tardanzas: <strong className="text-warning-600 dark:text-warning-400 font-bold">{loc.lateRate}%</strong></span>
                  <span>Inasistencias: <strong className="text-danger-600 dark:text-danger-400 font-bold">{loc.absentCount}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
