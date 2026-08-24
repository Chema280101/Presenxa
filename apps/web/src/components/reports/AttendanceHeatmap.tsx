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
  Info,
  Calendar,
  Layers,
  ChevronRight,
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
  const [showFull24Hours, setShowFull24Hours] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{
    dayName: string;
    hour: number;
    value: number;
    sub: string;
    extra?: string;
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

  // Rango de horas a visualizar: 06:00 a 21:00 (16 horas de jornada) o 00:00 a 23:00 (24h)
  const displayedHours = useMemo(() => {
    if (showFull24Hours) {
      return Array.from({ length: 24 }, (_, i) => i);
    }
    return Array.from({ length: 16 }, (_, i) => i + 6); // 6 to 21
  }, [showFull24Hours]);

  // Encontrar valor máximo para escala de color según el modo
  const maxVal = useMemo(() => {
    if (!matrix || matrix.length === 0) return 1;
    if (activeMode === "ENTRIES") return Math.max(1, ...matrix.map((c) => c.entries));
    if (activeMode === "EXITS") return Math.max(1, ...matrix.map((c) => c.exits));
    if (activeMode === "LATES") return Math.max(1, ...matrix.map((c) => c.lates));
    return 100; // Porcentaje para ausentismo
  }, [matrix, activeMode]);

  // Generador de colores según intensidad y modo
  const getCellColor = (val: number, isZero: boolean) => {
    if (isZero || val === 0) {
      return "bg-white/[0.02] border-white/5 text-slate-600";
    }

    const intensity = Math.min(1, val / maxVal);

    if (activeMode === "ENTRIES") {
      // Gradiente verde esmeralda a lima brillante neón
      if (intensity < 0.25) return "bg-emerald-950/60 border-emerald-500/20 text-emerald-300";
      if (intensity < 0.5) return "bg-emerald-700/60 border-emerald-400/40 text-emerald-200";
      if (intensity < 0.75) return "bg-emerald-500/80 border-emerald-300/60 text-white font-bold shadow-sm shadow-emerald-500/20";
      return "bg-lime-400 text-slate-950 border-lime-300 font-extrabold shadow-lg shadow-lime-400/40 animate-pulse";
    }

    if (activeMode === "EXITS") {
      // Gradiente azul a cian neón
      if (intensity < 0.25) return "bg-sky-950/60 border-sky-500/20 text-sky-300";
      if (intensity < 0.5) return "bg-sky-700/60 border-sky-400/40 text-sky-200";
      if (intensity < 0.75) return "bg-sky-500/80 border-sky-300/60 text-white font-bold shadow-sm shadow-sky-500/20";
      return "bg-cyan-300 text-slate-950 border-cyan-200 font-extrabold shadow-lg shadow-cyan-400/40 animate-pulse";
    }

    if (activeMode === "LATES") {
      // Gradiente ámbar a naranja ardiente
      if (intensity < 0.25) return "bg-amber-950/60 border-amber-500/20 text-amber-300";
      if (intensity < 0.5) return "bg-amber-700/60 border-amber-400/40 text-amber-200";
      if (intensity < 0.75) return "bg-amber-500/80 border-amber-300/60 text-slate-950 font-bold";
      return "bg-amber-400 text-slate-950 border-amber-300 font-extrabold shadow-lg shadow-amber-400/40";
    }

    // Default
    return "bg-emerald-500/40 border-emerald-500/30 text-white";
  };

  return (
    <div className="card-surface p-6 rounded-3xl border border-white/5 space-y-6 shadow-xl">
      {/* Top Header & Mode Selectors */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-lime-400/15 border border-lime-400/30 text-lime-400">
              <Flame className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Mapas de Calor y Horas Pico
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-lime-400/10 text-lime-300 border border-lime-400/20 text-[11px] font-bold">
              Analítica Visual
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Identifica visualmente la concentración de flujo de personas, picos de marcación y patrones de ausentismo.
          </p>
        </div>

        {/* Mode Toggle Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveMode("ENTRIES")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeMode === "ENTRIES"
                ? "bg-lime-400 text-slate-950 shadow-md font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Picos de Entrada</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("EXITS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeMode === "EXITS"
                ? "bg-sky-400 text-slate-950 shadow-md font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Picos de Salida</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("LATES")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeMode === "LATES"
                ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Tardanzas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("ABSENTEEISM")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeMode === "ABSENTEEISM"
                ? "bg-rose-500 text-white shadow-md font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Ausentismo por Sede</span>
          </button>
        </div>
      </div>

      {/* ── Executive Insights Strip ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-surface-950/70 border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-lime-400/10 text-lime-400 border border-lime-400/20 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">HORA PICO DE INGRESO</span>
            <strong className="text-white text-sm font-extrabold truncate block">
              {insights.peakEntryWindow}
            </strong>
            <span className="text-[11px] text-lime-300 font-medium">
              {insights.peakEntryDay} ({insights.peakEntryCount} ingresos)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-950/70 border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-400/10 text-sky-400 border border-sky-400/20 shrink-0">
            <LogOut className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">HORA PICO DE SALIDA</span>
            <strong className="text-white text-sm font-extrabold truncate block">
              {insights.peakExitWindow}
            </strong>
            <span className="text-[11px] text-sky-300 font-medium">
              {insights.peakExitDay} ({insights.peakExitCount} salidas)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-950/70 border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">FRANJA CRÍTICA TARDANZAS</span>
            <strong className="text-white text-sm font-extrabold truncate block">
              {insights.criticalLateWindow}
            </strong>
            <span className="text-[11px] text-amber-300 font-medium">
              {insights.criticalLateDay} ({insights.criticalLateCount} retrasos)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-950/70 border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">DÍA DE MAYOR AFLUENCIA</span>
            <strong className="text-white text-sm font-extrabold truncate block">
              {insights.busiestDay}
            </strong>
            <span className="text-[11px] text-emerald-300 font-medium">
              {insights.totalEntries} marcaciones registradas
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Heatmap Grid (Peak Hours / Lates) ────────────────── */}
      {activeMode !== "ABSENTEEISM" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="text-slate-400 flex items-center gap-2">
              <span className="font-semibold text-slate-300">
                {activeMode === "ENTRIES"
                  ? "Mapa de Densidad de Ingresos por Día y Hora"
                  : activeMode === "EXITS"
                  ? "Mapa de Densidad de Salidas por Día y Hora"
                  : "Concentración de Tardanzas por Franja"}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px]">Pasa el cursor sobre una celda para ver el detalle</span>
            </div>

            <button
              type="button"
              onClick={() => setShowFull24Hours(!showFull24Hours)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-semibold border border-white/10 cursor-pointer"
            >
              {showFull24Hours ? "Ver Horario Laboral (06h-21h)" : "Ver 24 Horas"}
            </button>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[760px]">
              {/* Hours Header Row */}
              <div className="grid grid-cols-[80px_repeat(16,1fr)] gap-1 text-[11px] font-mono text-slate-400 text-center mb-1.5">
                <div className="text-left font-sans font-semibold text-slate-500 pl-1">DÍA / HORA</div>
                {displayedHours.map((h) => (
                  <div key={h} className="py-1">
                    {String(h).padStart(2, "0")}h
                  </div>
                ))}
              </div>

              {/* Day Rows */}
              <div className="space-y-1">
                {orderedDays.map((day) => (
                  <div
                    key={day.id}
                    className="grid grid-cols-[80px_repeat(16,1fr)] gap-1 items-center"
                  >
                    {/* Day Name */}
                    <div className="text-xs font-bold text-slate-300 pl-1 text-left flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      <span>{day.short}</span>
                    </div>

                    {/* Hour Cells */}
                    {displayedHours.map((hour) => {
                      const cell = matrix.find((c) => c.dayOfWeek === day.id && c.hour === hour);
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
                                  ? `${cell?.onTime || 0} puntuales / ${cell?.lates || 0} tardes`
                                  : activeMode === "EXITS"
                                  ? `Salidas registradas`
                                  : `Promedio retraso: +${cell?.avgLateMinutes || 0} min`,
                              extra: cell && cell.entries > 0 ? `${Math.round((val / (insights.totalEntries || 1)) * 100)}% del total` : undefined,
                            })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`h-9 rounded-xl border flex items-center justify-center text-xs font-mono transition-all duration-150 cursor-pointer hover:scale-105 hover:z-10 relative group ${cellColorClass}`}
                        >
                          {val > 0 ? val : <span className="opacity-20 text-[10px]">•</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating Hover Card Detail */}
          {hoveredCell ? (
            <div className="p-3 rounded-2xl bg-surface-950 border border-primary-400/30 shadow-lg flex items-center justify-between text-xs animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary-400/15 text-primary-300 border border-primary-400/25 font-bold font-mono">
                  {String(hoveredCell.hour).padStart(2, "0")}:00
                </div>
                <div>
                  <h4 className="font-bold text-white">
                    {hoveredCell.dayName} a las {String(hoveredCell.hour).padStart(2, "0")}:00 - {String(hoveredCell.hour + 1).padStart(2, "0")}:00
                  </h4>
                  <p className="text-slate-300 text-[11px]">{hoveredCell.sub}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-mono font-black text-primary-400">
                  {hoveredCell.value}
                </span>
                <span className="text-slate-400 block text-[10px]">
                  {activeMode === "ENTRIES" ? "ingresos" : activeMode === "EXITS" ? "salidas" : "tardanzas"}
                </span>
              </div>
            </div>
          ) : (
            /* Color Legend */
            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-400">
              <span>Intensidad de flujo:</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-white/[0.04] border border-white/10" />
                  <span>0</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-emerald-950/60 border border-emerald-500/30" />
                  <span>Baja</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-emerald-700/60 border border-emerald-400/40" />
                  <span>Media</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-emerald-500/80 border border-emerald-300" />
                  <span>Alta</span>
                </span>
                <span className="flex items-center gap-1 font-bold text-lime-400">
                  <span className="w-3 h-3 rounded bg-lime-400 border border-lime-300" />
                  <span>Pico Máximo 🔥</span>
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Absenteeism Patterns by Location & Role ───────────────── */
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">
              Patrones de Inasistencia y Tardanzas por Sede
            </h3>
            <p className="text-xs text-slate-400">
              Comportamiento semanal por ubicación para detectar focos de ausentismo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locationPatterns.map((loc) => (
              <div
                key={loc.id}
                className="p-4 rounded-2xl bg-surface-950/80 border border-white/5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-primary-400" />
                    <h4 className="text-sm font-bold text-white">{loc.name}</h4>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono ${
                      loc.absenteeismRate > 10
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {loc.absenteeismRate}% Ausentismo
                  </span>
                </div>

                {/* Day of Week Absenteeism Bar */}
                <div className="grid grid-cols-7 gap-1 text-center font-mono">
                  {orderedDays.map((d) => {
                    const dayData = loc.daysBreakdown[d.id] || { present: 0, late: 0, absent: 0, total: 0 };
                    const rate = dayData.total ? Math.round((dayData.absent / dayData.total) * 100) : 0;

                    return (
                      <div key={d.id} className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-sans block">{d.short}</span>
                        <div
                          className={`h-8 rounded-lg flex items-center justify-center text-[11px] font-bold border transition-all ${
                            rate === 0
                              ? "bg-white/[0.03] border-white/5 text-slate-500"
                              : rate < 10
                              ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/20"
                              : rate < 25
                              ? "bg-amber-950/60 text-amber-300 border-amber-500/30"
                              : "bg-rose-600/80 text-white border-rose-400"
                          }`}
                          title={`${d.name}: ${dayData.absent} inasistencias de ${dayData.total}`}
                        >
                          {rate > 0 ? `${rate}%` : "0%"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5 font-mono">
                  <span>Puntualidad: <strong className="text-emerald-400">{loc.punctualityRate}%</strong></span>
                  <span>Tardanzas: <strong className="text-amber-400">{loc.lateRate}%</strong></span>
                  <span>Registros: <strong className="text-white">{loc.totalRecords}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
