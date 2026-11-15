"use client";

import { History, CalendarCheck2, Award, Clock, Timer } from "lucide-react";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import type { HistoryMetrics } from "./types";

interface MonthlyMetricsGridProps {
  metrics: HistoryMetrics | null;
  isLoading: boolean;
}

export function MonthlyMetricsGrid({
  metrics,
  isLoading,
}: Readonly<MonthlyMetricsGridProps>) {
  return (
    <section aria-label="Métricas del mes actual">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-surface-700 dark:text-surface-300">
          <History className="w-4 h-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
          Métricas del Mes Actual
        </h3>
        <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-primary-100 text-primary-800 border-primary-200 dark:bg-primary-500/15 dark:text-primary-300 dark:border-primary-500/30">
          Ciclo Activo
        </span>
      </div>

      {isLoading && !metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((idx) => (
            <SkeletonStatCard key={idx} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatCard
            label="Días Asistidos"
            value={metrics?.presents ?? 0}
            subLabel="Jornadas del ciclo"
            subValue={`/ ${metrics?.totalDays ?? 0}`}
            icon={CalendarCheck2}
            variant="emerald"
          />
          <StatCard
            label="Puntualidad"
            value={`${metrics?.punctualityRate ?? 100}%`}
            subLabel="Ingresos a tiempo"
            icon={Award}
            variant="cyan"
          />
          <StatCard
            label="Tardanzas"
            value={metrics?.lates ?? 0}
            subLabel="Eventos en el mes"
            icon={Clock}
            variant={(metrics?.lates ?? 0) > 0 ? "amber" : "default"}
          />
          <StatCard
            label="Horas Reales"
            value={`${metrics?.totalHoursWorked ?? 0}h`}
            subLabel="Tiempo acumulado"
            icon={Timer}
            variant="indigo"
          />
        </div>
      )}
    </section>
  );
}
