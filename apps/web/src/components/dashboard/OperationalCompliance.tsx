"use client";

import { Building, CheckCircle2, AlertCircle } from "lucide-react";



export interface AreaItem {
  id: string;
  code: string;
  name: string;
  current: number;
  required: number;
  percentage: number;
  accentColor: "emerald" | "cyan" | "amber" | "rose" | "slate";
}

interface OperationalComplianceProps {
  areas: AreaItem[];
  overallCompliance: number;
}

export function OperationalCompliance({
  areas = [],
  overallCompliance = 0
}: OperationalComplianceProps) {
  return (
    <div className="command-card p-5 sm:p-6 space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Cumplimiento Operativo por Área
          </h3>
          <p className="text-xs text-slate-400">
            Control de dotación presencial mínima según estándares de servicio
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-bold text-xs self-start sm:self-auto font-tabular">
          Dotación Global: {overallCompliance.toFixed(1)}%
        </span>
      </div>

      {/* Grid de Departamentos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
        {areas.map((area) => {
          const isComplete = area.current >= area.required;

          return (
            <div
              key={area.id}
              className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all flex flex-col justify-between gap-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      area.accentColor === "emerald"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : area.accentColor === "cyan"
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {area.code}
                  </div>

                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {area.name}
                  </span>
                </div>

                <span
                  className={`text-xs font-bold font-tabular flex-shrink-0 ${
                    isComplete ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {area.percentage}%
                </span>
              </div>

              {/* Barra de progreso */}
              <div className="space-y-1">
                <div className="w-full bg-slate-800/90 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      area.accentColor === "emerald"
                        ? "bg-emerald-400"
                        : area.accentColor === "cyan"
                        ? "bg-cyan-400"
                        : "bg-amber-400"
                    }`}
                    style={{ width: `${area.percentage}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Presentes: {area.current}</span>
                  <span>Meta: {area.required}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
