"use client";

import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface DailyRecord {
  date: string;
  present: number;
  late: number;
  absent: number;
  abandoned: number;
}

interface DailyTrendChartProps {
  data: DailyRecord[];
}

export function DailyTrendChart({ data }: DailyTrendChartProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Encontrar el día con mayor cantidad de registros para escalar (Y-axis max)
  const maxRecords = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return Math.max(
      ...data.map((d) => d.present + d.late + d.absent + d.abandoned)
    );
  }, [data]);

  const activeRecord = useMemo(() => {
    if (!hoveredDate || !data) return null;
    return data.find((d) => d.date === hoveredDate) || null;
  }, [hoveredDate, data]);

  if (!data || data.length === 0) return null;

  return (
    <div className="card-surface p-6 flex flex-col justify-between space-y-4">
      {/* Header con indicador dinámico en hover */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white mb-0.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-lime-400" />
            Evolución de Asistencia Diaria
          </h3>
          <p className="text-xs text-slate-400">
            Tendencia de puntualidad e incidencias a lo largo del periodo
          </p>
        </div>

        {/* Legend / Hover Live Stat */}
        <div className="flex items-center gap-3">
          {activeRecord ? (
            <div className="flex items-center gap-2.5 text-xs bg-lime-400/10 px-3 py-1.5 rounded-xl border border-lime-400/20 text-slate-200 animate-fade-in">
              <span className="font-bold text-lime-300">
                {format(parseISO(activeRecord.date), "EEE dd/MM", { locale: es })}:
              </span>
              <span className="flex items-center gap-1 font-mono text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {activeRecord.present}
              </span>
              <span className="flex items-center gap-1 font-mono text-amber-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {activeRecord.late}
              </span>
              <span className="flex items-center gap-1 font-mono text-rose-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                {activeRecord.absent + activeRecord.abandoned}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400 bg-surface-950/60 px-3 py-1.5 rounded-xl border border-white/5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Puntuales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Tardanzas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Ausencias
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Gráfico de Barras con espacio superior suficiente para tooltips */}
      <div className="relative h-64 w-full pt-16 pb-8">
        {/* Líneas guía (Grid Y) */}
        <div className="absolute inset-x-0 top-16 bottom-8 flex flex-col justify-between pointer-events-none">
          <div className="border-t border-white/5 w-full relative">
            <span className="absolute -top-2.5 left-0 text-[9px] text-slate-500 font-mono">
              {maxRecords}
            </span>
          </div>
          <div className="border-t border-white/5 w-full relative">
            <span className="absolute -top-2.5 left-0 text-[9px] text-slate-500 font-mono">
              {Math.ceil(maxRecords / 2)}
            </span>
          </div>
          <div className="border-t border-white/10 w-full relative">
            <span className="absolute -top-2.5 left-0 text-[9px] text-slate-500 font-mono">
              0
            </span>
          </div>
        </div>

        {/* Columnas de Datos */}
        <div className="relative h-full pl-6 flex items-end justify-between gap-1 sm:gap-2">
          {data.map((day, idx) => {
            const total = day.present + day.late + day.absent + day.abandoned;
            const heightPercent = maxRecords > 0 ? (total / maxRecords) * 100 : 0;
            
            const presentPercent = total > 0 ? (day.present / total) * 100 : 0;
            const latePercent = total > 0 ? (day.late / total) * 100 : 0;
            const absentPercent = total > 0 ? ((day.absent + day.abandoned) / total) * 100 : 0;

            const dateObj = parseISO(day.date);
            const shortDay = format(dateObj, "EEE dd", { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
            const isHovered = hoveredDate === day.date;
            const isDimmed = hoveredDate !== null && !isHovered;

            // Alineación de tooltip en extremos
            const tooltipAlign =
              idx === 0
                ? "left-0"
                : idx === data.length - 1
                ? "right-0"
                : "left-1/2 -translate-x-1/2";

            return (
              <div
                key={day.date}
                onMouseEnter={() => setHoveredDate(day.date)}
                onMouseLeave={() => setHoveredDate(null)}
                className={`group relative flex flex-col justify-end items-center flex-1 min-w-[20px] max-w-[44px] h-full transition-opacity duration-200 ${
                  isDimmed ? "opacity-40" : "opacity-100"
                }`}
              >
                {/* Tooltip Hover que nunca se corta */}
                <div
                  className={`absolute bottom-full mb-3 z-30 pointer-events-none flex flex-col items-center transition-all duration-150 ${tooltipAlign} ${
                    isHovered ? "opacity-100 scale-100" : "opacity-0 scale-95"
                  }`}
                >
                  <div className="bg-surface-900/95 backdrop-blur-md border border-white/15 rounded-xl p-3 shadow-2xl min-w-[135px]">
                    <p className="text-[11px] text-slate-300 font-bold mb-1.5 border-b border-white/10 pb-1 flex items-center justify-between">
                      <span>{format(dateObj, "EEE dd 'de' MMM", { locale: es })}</span>
                      <span className="text-[10px] text-slate-400 font-normal">Tot: {total}</span>
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Puntuales:
                        </span>
                        <span className="font-mono text-white font-bold">{day.present}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-amber-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Tardanzas:
                        </span>
                        <span className="font-mono text-white font-bold">{day.late}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-rose-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Ausencias:
                        </span>
                        <span className="font-mono text-white font-bold">{day.absent + day.abandoned}</span>
                      </div>
                    </div>
                  </div>
                  {/* Flecha del tooltip */}
                  <div className="w-2.5 h-2.5 bg-surface-900 border-b border-r border-white/15 rotate-45 -mt-1.5 shadow-sm" />
                </div>

                {/* Barra Apilada */}
                <div
                  className={`w-full flex flex-col justify-end rounded-t-md overflow-hidden bg-surface-800/40 transition-all duration-200 cursor-pointer border-x border-t ${
                    isHovered
                      ? "border-lime-400/50 shadow-[0_0_15px_rgba(163,230,53,0.15)] brightness-110"
                      : "border-white/5 hover:border-white/20"
                  }`}
                  style={{ height: `${Math.max(heightPercent, 4)}%` }}
                >
                  {/* Ausentes (Top) */}
                  {absentPercent > 0 && (
                    <div
                      className="bg-rose-500 w-full transition-all"
                      style={{ height: `${absentPercent}%` }}
                    />
                  )}
                  {/* Tardanzas (Middle) */}
                  {latePercent > 0 && (
                    <div
                      className="bg-amber-400 w-full transition-all"
                      style={{ height: `${latePercent}%` }}
                    />
                  )}
                  {/* Presentes (Bottom) */}
                  {presentPercent > 0 && (
                    <div
                      className="bg-emerald-500 w-full transition-all"
                      style={{ height: `${presentPercent}%` }}
                    />
                  )}
                </div>
                
                {/* Eje X (Etiqueta Fecha) */}
                <span
                  className={`text-[9px] mt-2 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center transition-colors font-medium ${
                    isHovered ? "text-lime-400 font-bold" : "text-slate-500"
                  }`}
                >
                  {shortDay}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
