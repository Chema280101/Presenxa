"use client";

import { AlertTriangle, Clock } from "lucide-react";

interface LateSeverityData {
  tolerance: number; // 1-5 min
  light: number;     // 6-15 min
  severe: number;    // 16-30 min
  critical: number;  // > 30 min
}

interface LateSeverityChartProps {
  data: LateSeverityData;
  totalLates: number;
}

export function LateSeverityChart({ data, totalLates }: LateSeverityChartProps) {
  if (totalLates === 0) return null;

  const items = [
    { label: "Tolerancia (1-5 min)", value: data.tolerance, color: "bg-lime-400", bg: "bg-lime-400/20" },
    { label: "Leve (6-15 min)", value: data.light, color: "bg-amber-400", bg: "bg-amber-400/20" },
    { label: "Grave (16-30 min)", value: data.severe, color: "bg-orange-500", bg: "bg-orange-500/20" },
    { label: "Crítico (>30 min)", value: data.critical, color: "bg-rose-600", bg: "bg-rose-600/20" },
  ];

  return (
    <div className="card-surface p-6 flex flex-col justify-between space-y-4 border-t border-white/5">
      <div>
        <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Severidad de Tardanzas
        </h3>
        <p className="text-xs text-slate-400">
          Distribución de los {totalLates} retrasos por rangos de tiempo
        </p>
      </div>

      <div className="space-y-4 mt-2">
        {items.map((item) => {
          const percent = totalLates > 0 ? (item.value / totalLates) * 100 : 0;
          return (
            <div key={item.label} className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300">{item.label}</span>
                <span className="font-bold text-white font-mono">
                  {item.value} <span className="text-slate-500 text-[10px] ml-1">({Math.round(percent)}%)</span>
                </span>
              </div>
              <div className={`w-full ${item.bg} rounded-full h-2 overflow-hidden`}>
                <div
                  className={`${item.color} h-2 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(0,0,0,0.2)]`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {data.critical > 0 && (
        <div className="mt-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-rose-300/90 leading-relaxed">
            Se han detectado <strong className="text-rose-400">{data.critical} tardanzas críticas</strong>. Se recomienda revisar políticas disciplinarias para casos superiores a 30 minutos.
          </p>
        </div>
      )}
    </div>
  );
}
