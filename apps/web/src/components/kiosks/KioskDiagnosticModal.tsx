"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, CheckCircle2, AlertCircle, Wifi, Database, ShieldCheck, RefreshCw, Activity, Clock, Server } from "lucide-react";
import { ModalShell } from "@/components/ui/ModalShell";

interface TelemetryData {
  timestamp: string;
  executionTimeMs: number;
  checks: {
    api: {
      status: "up" | "down";
      latencyMs: number;
    };
    database: {
      status: "up" | "down";
      latencyMs: number;
      error?: string | null;
    };
    crypto: {
      status: "verified" | "failed";
      algorithm: string;
      latencyMs: number;
      secretMode: string;
      details: string;
    };
    kiosks: {
      total: number;
      active: number;
      online: number;
      offline: number;
      lastHeartbeat: {
        name: string;
        location: string;
        ipAddress: string;
        lastSeenAt: string;
        minutesAgo: number | null;
      } | null;
    };
    offlineBuffer: {
      todaySyncCount: number;
      totalSyncCount: number;
      protocol: string;
      batchSizeMax: number;
    };
    system: {
      uptimeSeconds: number;
      memoryUsedMB: number;
      memoryTotalMB: number;
      nodeVersion: string;
      environment: string;
    };
  };
}

interface KioskDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  kiosksCount: number;
  onlineCount: number;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m`;
}

type DiagnosticStateKey = "running" | "optimal" | "warning" | "degraded";

const DIAGNOSTIC_UI_META: Record<
  DiagnosticStateKey,
  {
    bannerClass: string;
    subtitleClass: string;
    btnClass: string;
    title: string;
    globalLabel: string;
    globalClass: string;
  }
> = {
  running: {
    bannerClass: "bg-info-50 dark:bg-info-950/30 border-info-200 dark:border-info-500/30 text-info-700 dark:text-info-300",
    subtitleClass: "text-info-600 dark:text-info-400",
    btnClass: "bg-info-100 dark:bg-white/10 text-info-700 dark:text-white",
    title: "Auditando telemetría viva del servidor y base de datos...",
    globalLabel: "DEGRADED",
    globalClass: "text-rose-500",
  },
  optimal: {
    bannerClass: "bg-success-50 dark:bg-success-950/30 border-success-200 dark:border-success-500/30 text-success-700 dark:text-success-300",
    subtitleClass: "text-success-600 dark:text-success-400",
    btnClass: "bg-success-100 dark:bg-white/10 hover:bg-success-200 dark:hover:bg-white/15 text-success-800 dark:text-white",
    title: "Red Operativa - Todos los Sistemas en Parámetros Óptimos",
    globalLabel: "OPTIMAL",
    globalClass: "text-emerald-500",
  },
  warning: {
    bannerClass: "bg-warning-50 dark:bg-warning-950/30 border-warning-200 dark:border-warning-500/30 text-warning-700 dark:text-warning-300",
    subtitleClass: "text-warning-600 dark:text-warning-400",
    btnClass: "bg-warning-100 dark:bg-white/10 hover:bg-warning-200 dark:hover:bg-white/15 text-warning-800 dark:text-white",
    title: "Atención Requerida en Algunos Nodos Kiosk",
    globalLabel: "WARNING",
    globalClass: "text-amber-500",
  },
  degraded: {
    bannerClass: "bg-danger-50 dark:bg-danger-950/30 border-danger-200 dark:border-danger-500/30 text-danger-700 dark:text-danger-300",
    subtitleClass: "text-danger-600 dark:text-danger-400",
    btnClass: "bg-warning-100 dark:bg-white/10 hover:bg-warning-200 dark:hover:bg-white/15 text-warning-800 dark:text-white",
    title: "Falla o Degradación Detectada en la Infraestructura",
    globalLabel: "DEGRADED",
    globalClass: "text-rose-500",
  },
};

function resolveDiagnosticStateKey(
  isRunning: boolean,
  isOptimal: boolean,
  isHealthyWithWarnings: boolean
): DiagnosticStateKey {
  if (isRunning) return "running";
  if (isOptimal) return "optimal";
  if (isHealthyWithWarnings) return "warning";
  return "degraded";
}

function renderStatusIcon(stateKey: DiagnosticStateKey) {
  if (stateKey === "running") {
    return <RefreshCw className="w-6 h-6 text-info-500 animate-spin shrink-0" />;
  }
  if (stateKey === "optimal") {
    return <CheckCircle2 className="w-6 h-6 text-success-500 shrink-0" />;
  }
  if (stateKey === "warning") {
    return <AlertCircle className="w-6 h-6 text-warning-500 shrink-0" />;
  }
  return <AlertCircle className="w-6 h-6 text-danger-500 shrink-0" />;
}

function getLatencyMeta(clientLatency: number | null): { colorClass: string; description: string } {
  if (clientLatency === null) {
    return { colorClass: "text-surface-500", description: "Midiendo respuesta HTTP..." };
  }
  if (clientLatency < 400) {
    return { colorClass: "text-emerald-500", description: "Excelente respuesta HTTP" };
  }
  if (clientLatency < 1000) {
    return { colorClass: "text-amber-500", description: "Latencia moderada de servidor" };
  }
  return { colorClass: "text-rose-500", description: "Latencia elevada de servidor" };
}

function getKioskSummaryText(data: TelemetryData | null): string {
  const kiosks = data?.checks.kiosks;
  if (!kiosks) return "0 dispositivo(s) sin heartbeat reciente";
  if (kiosks.total === 0) return "Sin kioskos registrados en la sede";
  if (kiosks.online === kiosks.total) return "100% de dispositivos con heartbeat reciente";
  if (kiosks.lastHeartbeat) {
    return `Último: ${kiosks.lastHeartbeat.name} (IP ${kiosks.lastHeartbeat.ipAddress})`;
  }
  return `${kiosks.offline} dispositivo(s) sin heartbeat reciente`;
}

function getCryptoSummaryText(data: TelemetryData | null): string {
  if (!data) return "Verificando firmas HMAC en tiempo real...";
  const secretLabel =
    data.checks.crypto.secretMode === "PRODUCTION_DEDICATED"
      ? "Secret Dedicado"
      : "Secret Global";
  return `HMAC-SHA256 verificado (${secretLabel})`;
}

function SystemResourcesSection({
  data,
  globalLabel,
  globalClass,
}: Readonly<{
  data: TelemetryData | null;
  globalLabel: string;
  globalClass: string;
}>) {
  return (
    <div className="p-4 rounded-2xl bg-surface-100 dark:bg-[#1A2333]/70 border border-surface-200 dark:border-white/5 space-y-3 shadow-inner">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-surface-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-primary-500" />
          <span>Recursos &amp; Búfer del Sistema</span>
        </h4>
        <span className="text-[11px] font-mono text-surface-500 dark:text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3 text-surface-400" />
          Uptime: {data ? formatUptime(data.checks.system.uptimeSeconds) : "--"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
        {/* Memoria RAM Node.js */}
        <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-surface-200 dark:border-white/5 shadow-sm">
          <span className="text-[10px] text-surface-500 dark:text-slate-400 block mb-0.5 font-medium">
            Memoria Heap (Node.js)
          </span>
          <span className="text-sm font-bold font-mono text-surface-900 dark:text-white">
            {data?.checks.system.memoryUsedMB ? `${data.checks.system.memoryUsedMB} MB` : "--"}
          </span>
          <span className="text-[10px] text-surface-400 dark:text-slate-500 block mt-0.5">
            Total: {data?.checks.system.memoryTotalMB || "--"} MB
          </span>
        </div>

        {/* Sincronización Offline Real */}
        <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-surface-200 dark:border-white/5 shadow-sm">
          <span className="text-[10px] text-surface-500 dark:text-slate-400 block mb-0.5 font-medium">
            Sincronización Offline
          </span>
          <span className="text-sm font-bold font-mono text-emerald-500">
            {data ? `${data.checks.offlineBuffer.todaySyncCount} hoy` : "--"}
          </span>
          <span className="text-[10px] text-surface-400 dark:text-slate-500 block mt-0.5">
            {data ? `${data.checks.offlineBuffer.totalSyncCount} en histórico` : "Búfer local"}
          </span>
        </div>

        {/* Estado Global */}
        <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-surface-200 dark:border-white/5 shadow-sm">
          <span className="text-[10px] text-surface-500 dark:text-slate-400 block mb-0.5 font-medium">
            Estado Global
          </span>
          <span className={`text-sm font-bold font-mono ${globalClass}`}>
            {globalLabel}
          </span>
          <span className="text-[10px] text-surface-400 dark:text-slate-500 block mt-0.5">
            Entorno: {data?.checks.system.environment || "dev"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function KioskDiagnosticModal({
  isOpen,
  onClose,
  kiosksCount,
  onlineCount,
}: Readonly<KioskDiagnosticModalProps>) {
  const [isRunning, setIsRunning] = useState(false);
  const [clientLatency, setClientLatency] = useState<number | null>(null);
  const [data, setData] = useState<TelemetryData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runDiagnostic = useCallback(async () => {
    setIsRunning(true);
    setErrorMsg(null);

    const startClient = performance.now();

    try {
      const res = await fetch("/api/kiosks/diagnostic", {
        cache: "no-store",
        headers: { "Pragma": "no-cache" },
      });

      const clientEnd = performance.now();
      setClientLatency(Math.max(1, Math.round(clientEnd - startClient)));

      if (!res.ok) {
        throw new Error(`El servidor respondió con código HTTP ${res.status}`);
      }

      const telemetry: TelemetryData = await res.json();
      setData(telemetry);
    } catch (err: any) {
      console.error("Error al ejecutar telemetría real:", err);
      setErrorMsg(err?.message || "No se pudo comunicar con el subsistema de telemetría.");
    } finally {
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void runDiagnostic();
    }
  }, [isOpen, runDiagnostic]);

  if (!isOpen) return null;

  // Evaluación de Salud Global Real
  const isDbUp = data?.checks.database.status === "up";
  const isCryptoOk = data?.checks.crypto.status === "verified";
  const areAllKiosksOnline = data ? data.checks.kiosks.offline === 0 : onlineCount === kiosksCount;
  const isHighLatency = clientLatency !== null && clientLatency >= 1000;

  const isOptimal = isDbUp && isCryptoOk && areAllKiosksOnline && !isHighLatency && !errorMsg;
  const isHealthyWithWarnings = isDbUp && isCryptoOk && (!areAllKiosksOnline || isHighLatency) && !errorMsg;
  const stateKey = resolveDiagnosticStateKey(isRunning, isOptimal, isHealthyWithWarnings);
  const statusMeta = DIAGNOSTIC_UI_META[stateKey];
  const globalMeta = DIAGNOSTIC_UI_META[
    resolveDiagnosticStateKey(false, isOptimal, isHealthyWithWarnings)
  ];
  const latencyMeta = getLatencyMeta(clientLatency);

  const displayTime = data?.timestamp
    ? new Date(data.timestamp).toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  const diagnosticSubtitle = isRunning
    ? "Verificando firmas HMAC, latencia SQL y heartbeats..."
    : errorMsg ?? `Diagnóstico finalizado a las ${displayTime} (RTT total: ${clientLatency ?? "--"} ms)`;

  const footer = (
    <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
      <div className="flex items-center gap-2 text-[11px] text-surface-600 dark:text-slate-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" aria-hidden="true" />
        <span>Telemetría verificada en tiempo real contra el servidor y la base de datos.</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="min-h-[40px] px-5 py-2 rounded-xl bg-surface-100 dark:bg-white/10 hover:bg-surface-200 dark:hover:bg-white/15 text-surface-900 dark:text-white font-semibold text-xs transition-colors cursor-pointer w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        Cerrar Diagnóstico
      </button>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Diagnóstico de Red Kiosks & Telemetría"
      description="Auditoría en tiempo real de nodos tótems, bases de datos y motor criptográfico."
      icon={Sparkles}
      iconVariant="info"
      maxWidth="2xl"
      footer={footer}
    >
      <div className="flex flex-col space-y-5 py-1">
        {/* Banner Superior de Estado Operativo */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${statusMeta.bannerClass}`}
        >
          <div className="flex items-center gap-3">
            {renderStatusIcon(stateKey)}
            <div>
              <p className="font-bold text-sm text-surface-900 dark:text-white">
                {statusMeta.title}
              </p>
              <p className={`text-xs mt-0.5 ${statusMeta.subtitleClass}`}>
                {diagnosticSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={runDiagnostic}
            disabled={isRunning}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 disabled:opacity-50 cursor-pointer shrink-0 self-end sm:self-auto ${statusMeta.btnClass}`}
            aria-label="Reejecutar prueba de telemetría"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
            <span>Volver a probar</span>
          </button>
        </div>

        {/* Rejilla de 4 Métricas Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. Enlace API Web */}
          <div className="p-3.5 rounded-2xl bg-surface-50 dark:bg-[#1A2333] border border-surface-200 dark:border-white/5 flex items-start gap-3 shadow-sm hover:border-primary-400/30 transition-all">
            <div className="p-2 rounded-xl bg-surface-200 dark:bg-white/5 text-surface-600 dark:text-slate-300 shrink-0 mt-0.5">
              <Wifi className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-surface-900 dark:text-slate-200">
                  Enlace API Web
                </span>
                <span
                  className={`text-[11px] font-mono font-bold ${latencyMeta.colorClass}`}
                >
                  {clientLatency !== null ? `${clientLatency} ms` : "..."}
                </span>
              </div>
              <p className="text-[11px] text-surface-500 dark:text-slate-400 mt-1 truncate">
                {latencyMeta.description}
              </p>
            </div>
          </div>

          {/* 2. Base de Datos Prisma */}
          <div className="p-3.5 rounded-2xl bg-surface-50 dark:bg-[#1A2333] border border-surface-200 dark:border-white/5 flex items-start gap-3 shadow-sm hover:border-primary-400/30 transition-all">
            <div className="p-2 rounded-xl bg-surface-200 dark:bg-white/5 text-surface-600 dark:text-slate-300 shrink-0 mt-0.5">
              <Database className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-surface-900 dark:text-slate-200">
                  Base de Datos Prisma
                </span>
                <span className="text-[11px] font-mono font-bold text-cyan-500">
                  {data ? `${data.checks.database.latencyMs} ms` : "..."}
                </span>
              </div>
              <p className="text-[11px] text-surface-500 dark:text-slate-400 mt-1 truncate">
                {data?.checks.database.status === "up"
                  ? "Conexión PostgreSQL viva (SELECT 1)"
                  : data?.checks.database.error || "Desconectado de PostgreSQL"}
              </p>
            </div>
          </div>

          {/* 3. Nodos Kiosk en Red */}
          <div className="p-3.5 rounded-2xl bg-surface-50 dark:bg-[#1A2333] border border-surface-200 dark:border-white/5 flex items-start gap-3 shadow-sm hover:border-primary-400/30 transition-all">
            <div className="p-2 rounded-xl bg-surface-200 dark:bg-white/5 text-surface-600 dark:text-slate-300 shrink-0 mt-0.5">
              <Activity className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-surface-900 dark:text-slate-200">
                  Nodos Kiosk Online
                </span>
                <span className="text-[11px] font-mono font-bold text-surface-900 dark:text-white">
                  {data
                    ? `${data.checks.kiosks.online} / ${data.checks.kiosks.total}`
                    : `${onlineCount} / ${kiosksCount}`}
                </span>
              </div>
              <p className="text-[11px] text-surface-500 dark:text-slate-400 mt-1 truncate">
                {getKioskSummaryText(data)}
              </p>
            </div>
          </div>

          {/* 4. Motor Criptográfico HMAC-SHA256 */}
          <div className="p-3.5 rounded-2xl bg-surface-50 dark:bg-[#1A2333] border border-surface-200 dark:border-white/5 flex items-start gap-3 shadow-sm hover:border-primary-400/30 transition-all">
            <div className="p-2 rounded-xl bg-surface-200 dark:bg-white/5 text-surface-600 dark:text-slate-300 shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-surface-900 dark:text-slate-200">
                  Protocolo Criptográfico
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-500">
                  {data?.checks.crypto.status === "verified"
                    ? `${data.checks.crypto.latencyMs} ms OK`
                    : "..."}
                </span>
              </div>
              <p className="text-[11px] text-surface-500 dark:text-slate-400 mt-1 truncate">
                {getCryptoSummaryText(data)}
              </p>
            </div>
          </div>
        </div>

        {/* Sección de Recursos & Búfer del Sistema */}
        <SystemResourcesSection
          data={data}
          globalLabel={globalMeta.globalLabel}
          globalClass={globalMeta.globalClass}
        />
      </div>
    </ModalShell>
  );
}
