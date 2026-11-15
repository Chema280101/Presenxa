"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, History, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { HistoryItem } from "./types";

function getStatusVisual(status: string) {
  const normalized = (status || "").toUpperCase();
  switch (normalized) {
    case "PRESENTE":
      return {
        dot: "bg-primary-500 ring-primary-500/20",
        badge:
          "bg-primary-500/15 text-primary-700 dark:text-primary-300 border-primary-500/30",
        entryText: "text-primary-600 dark:text-primary-400",
        label: "Presente",
      };
    case "TARDE":
      return {
        dot: "bg-warning-500 ring-warning-500/20",
        badge:
          "bg-warning-100 dark:bg-warning-500/15 text-warning-800 dark:text-warning-300 border-warning-200 dark:border-warning-500/30",
        entryText: "text-warning-600 dark:text-warning-400",
        label: "Tarde",
      };
    case "AUSENTE":
    case "ABANDONO_PUESTO":
      return {
        dot: "bg-danger-500 ring-danger-500/20",
        badge:
          "bg-danger-50 dark:bg-danger-500/15 text-danger-700 dark:text-danger-300 border-danger-200 dark:border-danger-500/30",
        entryText: "text-danger-600 dark:text-danger-400",
        label: normalized === "ABANDONO_PUESTO" ? "Abandono" : "Ausente",
      };
    case "JUSTIFICADO":
    case "PERMISO":
      return {
        dot: "bg-info-500 ring-info-500/20",
        badge:
          "bg-info-50 dark:bg-info-500/15 text-info-700 dark:text-info-300 border-info-200 dark:border-info-500/30",
        entryText: "text-info-600 dark:text-info-400",
        label: normalized === "PERMISO" ? "Permiso" : "Justificado",
      };
    case "INCOMPLETO":
      return {
        dot: "bg-warning-400 ring-warning-400/20",
        badge:
          "bg-warning-50 dark:bg-warning-500/10 text-warning-700 dark:text-warning-300 border-warning-200 dark:border-warning-500/25",
        entryText: "text-warning-600 dark:text-warning-400",
        label: "Incompleto",
      };
    case "FERIADO":
      return {
        dot: "bg-surface-400 ring-surface-400/20",
        badge:
          "bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700",
        entryText: "text-surface-600 dark:text-surface-400",
        label: "Feriado",
      };
    default:
      return {
        dot: "bg-surface-400 ring-surface-400/20",
        badge:
          "bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700",
        entryText: "text-surface-700 dark:text-surface-300",
        label: normalized || "Registrado",
      };
  }
}

interface AttendanceHistoryCardProps {
  items: HistoryItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onViewCertificate: (item: HistoryItem) => void;
}

export function AttendanceHistoryCard({
  items,
  isLoading,
  onRefresh,
  onViewCertificate,
}: Readonly<AttendanceHistoryCardProps>) {
  const [showAll, setShowAll] = useState(false);
  const visibleItems = showAll ? items : items.slice(0, 3);
  const hasMore = items.length > 3;

  return (
    <section
      aria-label="Historial de marcaciones en Kiosk"
      className="rounded-2xl p-5 border space-y-4 bg-white border-surface-200 shadow-sm dark:bg-command-card dark:border-white/10"
    >
      <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-white/5">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2 text-surface-900 dark:text-white">
            <History className="w-4 h-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            Historial de Marcaciones en Kiosk
          </h3>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Últimos 30 días · Auditoría criptográfica verificada
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Actualizar historial de marcaciones"
          title="Actualizar historial"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors text-surface-500 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-white dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          <RefreshCw
            className={`w-4 h-4 ${isLoading ? "animate-spin motion-reduce:animate-none" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {isLoading && items.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((idx) => (
            <Skeleton key={idx} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center text-sm text-surface-500 dark:text-surface-400">
          No hay registros recientes en los últimos 30 días.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => {
            const visual = getStatusVisual(item.status);
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-50 border-surface-200 hover:border-primary-300 dark:bg-surface-900/70 dark:border-white/10 dark:hover:border-primary-500/30"
              >
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className={`w-2.5 h-2.5 rounded-full ring-4 shrink-0 ${visual.dot}`}
                  />
                  <div>
                    <div className="text-xs font-bold flex items-center gap-2 text-surface-900 dark:text-white flex-wrap">
                      <span className="font-mono">{item.date}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${visual.badge}`}
                      >
                        {visual.label}
                      </span>
                    </div>
                    <div className="text-xs mt-0.5 text-surface-500 dark:text-surface-400">
                      {item.locationName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono justify-between sm:justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-surface-200 dark:border-white/10 flex-wrap">
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-surface-500 dark:text-surface-400 block font-sans">
                      Entrada
                    </span>
                    <span className={`font-bold ${visual.entryText}`}>
                      {item.entryTime || "--:--"}
                    </span>
                  </div>
                  <div className="text-surface-400" aria-hidden="true">
                    →
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-surface-500 dark:text-surface-400 block font-sans">
                      Salida
                    </span>
                    <span className="font-bold text-surface-700 dark:text-surface-200">
                      {item.exitTime2 || item.exitTime || "--:--"}
                    </span>
                  </div>
                  <div className="text-left sm:text-right pl-2 border-l border-surface-200 dark:border-white/10">
                    <span className="text-xs text-surface-500 dark:text-surface-400 block font-sans">
                      Total
                    </span>
                    <span className="font-bold text-surface-800 dark:text-surface-200">
                      {item.workedMinutes
                        ? `${Math.floor(item.workedMinutes / 60)}h ${item.workedMinutes % 60}m`
                        : "--"}
                    </span>
                  </div>
                  {(item.status === "JUSTIFICADO" || item.status === "PERMISO") && (
                    <button
                      type="button"
                      onClick={() => onViewCertificate(item)}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg bg-info-500/10 hover:bg-info-500/20 text-info-700 dark:text-info-300 border border-info-500/25 text-xs font-bold flex items-center gap-1.5 transition"
                      title="Ver o imprimir constancia oficial"
                    >
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Constancia</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-surface-200 dark:border-white/10 bg-surface-50 hover:bg-surface-100 dark:bg-surface-900 dark:hover:bg-surface-800 text-xs font-semibold text-surface-700 dark:text-surface-300 flex items-center justify-center gap-1.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  Ver historial completo ({items.length})
                </>
              )}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
