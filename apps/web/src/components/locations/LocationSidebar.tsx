"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  QrCode,
  Activity,
  ArrowRight,
  ShieldCheck,
  Wifi,
  Server,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface LocationSidebarProps {
  totalLocations: number;
  totalKiosks: number;
}

interface DiagnosticResponse {
  timestamp: string;
  checks: {
    api: { status: "up" | "down"; latencyMs: number };
    database: { status: "up" | "down"; latencyMs: number; error: string | null };
    crypto: {
      status: "verified" | "failed";
      algorithm: string;
      latencyMs: number;
      secretMode: "PRODUCTION_DEDICATED" | "SYSTEM_AUTH_SHARED";
    };
    kiosks: {
      total: number;
      active: number;
      online: number;
      offline: number;
    };
    offlineBuffer: {
      todaySyncCount: number;
      totalSyncCount: number;
    };
  };
}

export function LocationSidebar({ totalLocations, totalKiosks }: LocationSidebarProps) {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const fetchDiagnostic = useCallback(async (manual = false) => {
    try {
      if (manual) setIsRefreshing(true);
      setHasError(false);

      const res = await fetch("/api/kiosks/diagnostic", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: DiagnosticResponse = await res.json();
      setDiagnostic(data);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDiagnostic();
  }, [fetchDiagnostic]);

  const terminalLabel = totalKiosks === 1 ? "terminal" : "terminales";
  const sedeLabel = totalLocations === 1 ? "sede" : "sedes";

  const checks = diagnostic?.checks;
  const isSystemHealthy =
    Boolean(checks) &&
    checks?.database.status === "up" &&
    checks?.crypto.status === "verified";

  const statusBadge = isLoading
    ? {
        label: "Verificando…",
        classes:
          "bg-surface-100 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300",
      }
    : hasError || !checks
      ? {
          label: "Sin conexión",
          classes:
            "bg-danger-50 dark:bg-danger-500/15 border-danger-200 dark:border-danger-500/30 text-danger-700 dark:text-danger-300",
        }
      : isSystemHealthy
        ? {
            label: "Operativo",
            classes:
              "bg-primary-50 dark:bg-primary-500/15 border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-300",
          }
        : {
            label: "Degradado",
            classes:
              "bg-warning-50 dark:bg-warning-500/15 border-warning-200 dark:border-warning-500/30 text-warning-700 dark:text-warning-300",
          };

  return (
    <aside className="flex flex-col gap-6">
      {/* 1. KIOSKS MANAGEMENT CALLOUT */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <MapPin className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                Puntos Kiosk Locales
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                {totalKiosks} {terminalLabel} en {totalLocations} {sedeLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-600 dark:text-surface-300">
            <QrCode className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-surface-900 dark:text-surface-100">
              Gestión de Hardware Centralizada
            </span>
            <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
              Empareja nuevos tótems, revisa latencias en vivo y gestiona llaves de acceso desde el módulo de kioskos.
            </p>
          </div>
        </div>

        <Link
          href="/kiosks"
          className="min-h-[44px] w-full py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-900"
        >
          <span>Administrar Kioskos</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </section>

      {/* 2. HARDWARE HEALTH & LIVE TELEMETRY */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-info-50 dark:bg-info-500/10 border border-info-200 dark:border-info-500/20 flex items-center justify-center text-info-600 dark:text-info-400">
              <Server className="w-4 h-4" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100 truncate">
              Salud del Hardware
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              role="status"
              aria-atomic="true"
              className={`px-2.5 py-1 rounded-full border font-mono text-[11px] font-bold ${statusBadge.classes}`}
            >
              {statusBadge.label}
            </span>
            <button
              type="button"
              onClick={() => fetchDiagnostic(true)}
              disabled={isRefreshing}
              aria-label="Actualizar diagnóstico de hardware"
              title="Actualizar diagnóstico"
              className="min-h-[36px] min-w-[36px] rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 flex items-center justify-center transition cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Cargando telemetría">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="h-[58px] rounded-xl bg-surface-100 dark:bg-surface-800/60 animate-pulse"
              />
            ))}
          </div>
        ) : hasError || !checks ? (
          <div className="p-4 rounded-xl bg-danger-50/70 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-danger-600 dark:text-danger-400 shrink-0" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-danger-800 dark:text-danger-200">
                  No se pudo consultar la telemetría
                </span>
                <span className="text-[11px] text-danger-600 dark:text-danger-400">
                  Reintenta para verificar BD, kioskos y firma QR.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchDiagnostic(true)}
              className="min-h-[36px] px-3 rounded-lg bg-white dark:bg-surface-900 border border-danger-200 dark:border-danger-500/30 text-xs font-bold text-danger-700 dark:text-danger-300 hover:bg-danger-50 dark:hover:bg-danger-500/20 transition cursor-pointer shrink-0"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {/* Row 1: Telemetría de Red & Base de Datos */}
            <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-surface-100 dark:bg-surface-700/60 flex items-center justify-center text-surface-600 dark:text-surface-300">
                  <Wifi className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs text-surface-900 dark:text-surface-100">
                    Telemetría API & BD
                  </span>
                  <span className="text-[11px] text-surface-500 dark:text-surface-400 truncate">
                    BD {checks.database.latencyMs}ms · API {checks.api.latencyMs}ms
                  </span>
                </div>
              </div>
              <span
                className={`shrink-0 font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                  checks.database.status === "up"
                    ? "text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/20"
                    : "text-danger-700 dark:text-danger-400 bg-danger-50 dark:bg-danger-500/10 border-danger-200 dark:border-danger-500/20"
                }`}
              >
                {checks.database.status === "up" ? "OK" : "Error"}
              </span>
            </div>

            {/* Row 2: Terminales & Sincronización Offline */}
            <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-surface-100 dark:bg-surface-700/60 flex items-center justify-center text-surface-600 dark:text-surface-300">
                  <Activity className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs text-surface-900 dark:text-surface-100">
                    Terminales & Sync
                  </span>
                  <span className="text-[11px] text-surface-500 dark:text-surface-400 truncate">
                    {checks.kiosks.online}/{checks.kiosks.total} en línea · {checks.offlineBuffer.todaySyncCount} syncs hoy
                  </span>
                </div>
              </div>
              <span
                className={`shrink-0 font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                  checks.kiosks.online > 0
                    ? "text-info-700 dark:text-info-400 bg-info-50 dark:bg-info-500/10 border-info-200 dark:border-info-500/20"
                    : "text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-800 border-surface-200 dark:border-surface-700"
                }`}
              >
                {checks.kiosks.total === 0
                  ? "Sin tótems"
                  : checks.kiosks.online > 0
                    ? `${checks.kiosks.online} Online`
                    : "Offline"}
              </span>
            </div>

            {/* Row 3: Seguridad QR */}
            <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-surface-100 dark:bg-surface-700/60 flex items-center justify-center text-surface-600 dark:text-surface-300">
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs text-surface-900 dark:text-surface-100">
                    Seguridad QR
                  </span>
                  <span className="text-[11px] text-surface-500 dark:text-surface-400 truncate">
                    {checks.crypto.algorithm} · {checks.crypto.latencyMs}ms
                  </span>
                </div>
              </div>
              <span
                className={`shrink-0 font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                  checks.crypto.status === "verified"
                    ? "text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/20"
                    : "text-danger-700 dark:text-danger-400 bg-danger-50 dark:bg-danger-500/10 border-danger-200 dark:border-danger-500/20"
                }`}
              >
                {checks.crypto.status === "verified" ? "Protegido" : "Fallo"}
              </span>
            </div>
          </div>
        )}
      </section>
    </aside>
  );
}
