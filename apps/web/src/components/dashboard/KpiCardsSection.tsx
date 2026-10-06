"use client";

import { CheckCircle2, Clock, AlertTriangle, XCircle, Sliders, TrendingUp, ShieldCheck } from "lucide-react";

interface KpiCardsSectionProps {
  totalAsistieron?: number;
  totalProgramados?: number;
  asistenciaPorcentaje?: number;
  asistenciaVsAyer?: string;
  puntualesCount?: number;
  puntualesPorcentaje?: number;
  toleranciaMargen?: string;
  tardanzasCount?: number;
  tardanzasMinPromedio?: number;
  tardanzasFoco?: string;
  descuentoEstimado?: string;
  ausenciasTotal?: number;
  inasistenciasCount?: number;
  cittCount?: number;
  coberturaRelevo?: number;
}

export function KpiCardsSection({
  totalAsistieron = 88,
  totalProgramados = 93,
  asistenciaPorcentaje = 94.6,
  asistenciaVsAyer = "+3.2% vs ayer",
  puntualesCount = 81,
  puntualesPorcentaje = 87.1,
  toleranciaMargen = "07:10 AM",
  tardanzasCount = 5,
  tardanzasMinPromedio = 14,
  tardanzasFoco = "Cocina & Stewarding (3 marc.)",
  descuentoEstimado = "S/ 48.20",
  ausenciasTotal = 4,
  inasistenciasCount = 2,
  cittCount = 2,
  coberturaRelevo = 95.7,
}: KpiCardsSectionProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* ── CARD 1: ASISTENCIA HOY ── */}
      <div className="command-card p-5 relative overflow-hidden flex flex-col justify-between hover:border-emerald-500/30 transition-all group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
            ASISTENCIA HOY
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl sm:text-4xl font-black text-surface-900 dark:text-white font-tabular tracking-tight">
              {totalAsistieron}
            </span>
            <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">
              / {totalProgramados} prog.
            </span>
            <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold font-tabular flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {asistenciaPorcentaje}%
            </span>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-surface-200 dark:bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(asistenciaPorcentaje, 100)}%` }}
            />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-surface-200 dark:border-white/[0.06] flex items-center justify-between text-[11px]">
          <span className="text-surface-500 dark:text-surface-400">Turno 06:00 - 15:00</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-tabular">{asistenciaVsAyer}</span>
        </div>
      </div>

      {/* ── CARD 2: PUNTUALES (TOLERANCIA 10M) ── */}
      <div className="command-card p-5 relative overflow-hidden flex flex-col justify-between hover:border-cyan-500/30 transition-all group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
            PUNTUALES (TOLERANCIA 10M)
          </span>
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Sliders className="w-4 h-4" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl sm:text-4xl font-black text-surface-900 dark:text-white font-tabular tracking-tight">
              {puntualesCount}
            </span>
            <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">colab.</span>
            <span className="ml-auto px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-[11px] font-bold font-tabular">
              {puntualesPorcentaje}% del total
            </span>
          </div>

          {/* Segmented distribution bars */}
          <div className="grid grid-cols-5 gap-1.5 h-2">
            <div className="bg-cyan-900/60 rounded-sm" />
            <div className="bg-cyan-800/80 rounded-sm" />
            <div className="bg-cyan-600 rounded-sm" />
            <div className="bg-cyan-400 rounded-sm" />
            <div className="bg-cyan-300 rounded-sm" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-surface-200 dark:border-white/[0.06] flex items-center justify-between text-[11px]">
          <span className="text-surface-500 dark:text-surface-400">Normativa D.Leg 728</span>
          <span className="text-cyan-700 dark:text-cyan-300 font-mono font-bold">
            Margen ≤ {toleranciaMargen}
          </span>
        </div>
      </div>

      {/* ── CARD 3: TARDANZAS REGISTRADAS ── */}
      <div className="command-card p-5 relative overflow-hidden flex flex-col justify-between hover:border-amber-500/30 transition-all group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
            TARDANZAS REGISTRADAS
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 font-tabular tracking-tight">
              {tardanzasCount}
            </span>
            <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">colab.</span>
            <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold font-tabular">
              +{tardanzasMinPromedio} min prom.
            </span>
          </div>

          <p className="text-[11px] text-surface-500 dark:text-surface-400 truncate">
            Foco en <span className="text-amber-700 dark:text-amber-200 font-medium">{tardanzasFoco}</span>
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-surface-200 dark:border-white/[0.06] flex items-center justify-between text-[11px]">
          <span className="text-surface-500 dark:text-surface-400">Descuento Estimado</span>
          <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">{descuentoEstimado} acum.</span>
        </div>
      </div>

      {/* ── CARD 4: AUSENCIAS / JUSTIFICADOS ── */}
      <div className="command-card p-5 relative overflow-hidden flex flex-col justify-between hover:border-rose-500/30 transition-all group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
            AUSENCIAS / JUSTIFICADOS
          </span>
          <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <XCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-surface-900 dark:text-white font-tabular tracking-tight">
              {ausenciasTotal}
            </span>
            <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">casos</span>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                {inasistenciasCount} Inasist.
              </span>
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                {cittCount} CITT
              </span>
            </div>
          </div>

          <p className="text-[11px] text-surface-500 dark:text-surface-400 truncate">
            2 descansos médicos CITT / EsSalud
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-surface-200 dark:border-white/[0.06] flex items-center justify-between text-[11px]">
          <span className="text-surface-500 dark:text-surface-400">Cobertura de Relevo</span>
          <span className="text-rose-600 dark:text-rose-400 font-mono font-bold font-tabular">
            {coberturaRelevo}% operativo
          </span>
        </div>
      </div>
    </div>
  );
}
