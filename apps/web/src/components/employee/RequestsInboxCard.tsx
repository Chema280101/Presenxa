"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ClipboardList, ExternalLink, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { MyTimeOffItem } from "./types";

interface RequestsInboxCardProps {
  requests: MyTimeOffItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function RequestsInboxCard({
  requests,
  isLoading,
  onRefresh,
}: Readonly<RequestsInboxCardProps>) {
  const [showAll, setShowAll] = useState(false);
  const visibleRequests = showAll ? requests : requests.slice(0, 4);
  const hasMore = requests.length > 4;

  return (
    <section
      aria-label="Mis solicitudes y permisos"
      className="rounded-2xl p-5 border space-y-4 bg-white border-surface-200 shadow-sm dark:bg-command-card dark:border-white/10"
    >
      <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-white/5">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2 text-surface-900 dark:text-white">
            <ClipboardList className="w-4 h-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            Mis Solicitudes y Permisos
          </h3>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Estado de tus licencias, vacaciones y descansos médicos
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Actualizar mis solicitudes"
          title="Actualizar solicitudes"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors text-surface-500 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-white dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          <RefreshCw
            className={`w-4 h-4 ${isLoading ? "animate-spin motion-reduce:animate-none" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {isLoading && requests.length === 0 ? (
        <div className="space-y-2.5">
          {[1, 2].map((idx) => (
            <Skeleton key={idx} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="py-5 text-center text-xs text-surface-500 dark:text-surface-400">
          Aún no has enviado solicitudes de ausencia o permisos.
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleRequests.map((req) => {
            const statusBadge =
              req.status === "APPROVED"
                ? {
                    label: "Aprobada",
                    cls: "bg-primary-500/15 text-primary-700 dark:text-primary-300 border-primary-500/30",
                  }
                : req.status === "REJECTED"
                ? {
                    label: "Rechazada",
                    cls: "bg-danger-500/15 text-danger-700 dark:text-danger-300 border-danger-500/30",
                  }
                : {
                    label: "Pendiente",
                    cls: "bg-warning-500/15 text-warning-800 dark:text-warning-300 border-warning-500/30",
                  };

            return (
              <div
                key={req.id}
                className="p-3.5 rounded-xl border bg-surface-50 border-surface-200 dark:bg-surface-900/70 dark:border-white/10 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-surface-900 dark:text-white">
                    {req.type.replaceAll("_", " ")}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${statusBadge.cls}`}
                  >
                    {statusBadge.label}
                  </span>
                </div>
                <div className="text-xs font-mono text-surface-600 dark:text-surface-400">
                  {req.startDate.slice(0, 10)} → {req.endDate.slice(0, 10)}
                </div>
                {req.reason && (
                  <p className="text-xs text-surface-600 dark:text-surface-300 line-clamp-2">
                    {req.reason}
                  </p>
                )}
                {req.status === "REJECTED" && req.rejectionReason && (
                  <p className="text-xs text-danger-700 dark:text-danger-300 font-medium bg-danger-50 dark:bg-danger-500/10 px-2.5 py-1.5 rounded-lg">
                    Motivo rechazo: {req.rejectionReason}
                  </p>
                )}
                {req.documentUrl && (
                  <a
                    href={req.documentUrl}
                    download={
                      req.documentUrl.startsWith("data:")
                        ? `sustento-${req.id.slice(0, 6)}`
                        : undefined
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 min-h-[36px] text-xs font-semibold text-primary-700 dark:text-primary-400 hover:underline pt-0.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    Ver documento adjunto
                  </a>
                )}
              </div>
            );
          })}

          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-surface-200 dark:border-white/10 bg-surface-50 hover:bg-surface-100 dark:bg-surface-900 dark:hover:bg-surface-800 text-xs font-semibold text-surface-700 dark:text-surface-300 flex items-center justify-center gap-1.5 transition"
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  Ver todas las solicitudes ({requests.length})
                </>
              )}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
