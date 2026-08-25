"use client";

import { useMemo } from "react";
import { TrendingUp, Info } from "lucide-react";
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
  // Encontrar el día con mayor cantidad de registros para escalar (Y-axis max)
  const maxRecords = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return Math.max(
      ...data.map((d) => d.present + d.late + d.absent + d.abandoned)
    );
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <div className="card-surface p-6 flex flex-col justify-between space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-lime-400" />
            Evolución de Asistencia Diaria
          </h3>
          <p className="text-xs text-slate-400">
            Tendencia de puntualidad e incidencias a lo largo del periodo seleccionado
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-medium text-slate-400 bg-surface-950/60 px-3 py-1.5 rounded-full border border-white/5">
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
      </div>

      {/* Gráfico de Barras con CSS Puro */}
      <div className="relative h-48 w-full">
        {/* Líneas guía (Grid Y) */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          <div className="border-t border-white/5 w-full h-0 relative">
            <span className="absolute -top-2 -left-6 text-[9px] text-slate-500 font-mono">
              {maxRecords}
            </span>
          </div>
          <div className="border-t border-white/5 w-full h-0 relative">
            <span className="absolute -top-2 -left-6 text-[9px] text-slate-500 font-mono">
              {Math.ceil(maxRecords / 2)}
            </span>
          </div>
          <div className="border-t border-white/10 w-full h-0 relative">
            <span className="absolute -top-2 -left-6 text-[9px] text-slate-500 font-mono">
              0
            </span>
          </div>
        </div>

        {/* Columnas de Datos */}
        <div className="absolute inset-0 pl-4 flex items-end justify-between gap-1 sm:gap-2 overflow-x-auto hide-scrollbar pt-4 pb-1">
          {data.map((day, idx) => {
            const total = day.present + day.late + day.absent + day.abandoned;
            // Evitar división por cero
            const heightPercent = maxRecords > 0 ? (total / maxRecords) * 100 : 0;
            
            const presentPercent = total > 0 ? (day.present / total) * 100 : 0;
            const latePercent = total > 0 ? (day.late / total) * 100 : 0;
            const absentPercent = total > 0 ? ((day.absent + day.abandoned) / total) * 100 : 0;

            const dateObj = parseISO(day.date);
            const shortDay = format(dateObj, "EEE dd", { locale: es }).replace(/^\w/, (c) => c.toUpperCase());

            return (
              <div
                key={day.date}
                className="group relative flex flex-col justify-end items-center flex-1 min-w-[24px] max-w-[40px] h-full"
              >
                {/* Tooltip Hover */}
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none flex flex-col items-center">
                  <div className="bg-surface-900 border border-white/10 rounded-xl p-2.5 shadow-xl min-w-[120px]">
                    <p className="text-[10px] text-slate-400 font-bold mb-1.5 border-b border-white/5 pb-1">
                      {format(dateObj, "EEEE dd 'de' MMMM", { locale: es })}
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-emerald-400">Puntuales:</span>
                        <span className="font-mono text-white font-bold">{day.present}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-amber-400">Tardanzas:</span>
                        <span className="font-mono text-white font-bold">{day.late}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-rose-400">Ausencias:</span>
                        <span className="font-mono text-white font-bold">{day.absent + day.abandoned}</span>
                      </div>
                    </div>
                  </div>
                  {/* Flechita del tooltip */}
                  <div className="w-2 h-2 bg-surface-900 border-b border-r border-white/10 rotate-45 -mt-1.5" />
                </div>

                {/* Barra Apilada */}
                <div
                  className="w-full flex flex-col justify-end rounded-t-sm overflow-hidden bg-surface-800/30 hover:brightness-125 transition-all cursor-crosshair border-x border-t border-white/5 hover:border-white/20"
                  style={{ height: `${heightPercent}%` }}
                >
                  {/* Ausentes (Top) */}
                  {absentPercent > 0 && (
                    <div
                      className="bg-rose-500 w-full"
                      style={{ height: `${absentPercent}%` }}
                    />
                  )}
                  {/* Tardanzas (Middle) */}
                  {latePercent > 0 && (
                    <div
                      className="bg-amber-400 w-full"
                      style={{ height: `${latePercent}%` }}
                    />
                  )}
                  {/* Presentes (Bottom) */}
                  {presentPercent > 0 && (
                    <div
                      className="bg-emerald-500 w-full"
                      style={{ height: `${presentPercent}%` }}
                    />
                  )}
                </div>
                
                {/* Eje X (Etiqueta Fecha) */}
                <span className="text-[9px] text-slate-500 mt-2 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center group-hover:text-white transition-colors">
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
