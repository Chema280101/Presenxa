import React from "react";
import {
  Building,
  Camera,
  Focus,
  Maximize,
  Minimize,
  Moon,
  RefreshCw,
  ScanLine,
  Settings,
  ShieldAlert,
  Sun,
  SwitchCamera,
  Volume2,
  VolumeX,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScanCelebrationCard, type ScanCelebrationData } from "@/components/kiosk/ScanCelebrationCard";

function getThemeToggleTitle(mounted: boolean, isAuto: boolean, theme: string | undefined): string {
  if (!mounted) return "Cambiar Tema";
  if (isAuto) {
    return theme === "dark"
      ? "Modo oscuro automático (7:00 PM - 6:00 AM) • Clic para cambiar a claro"
      : "Modo claro automático (6:00 AM - 7:00 PM) • Clic para cambiar a oscuro";
  }
  const modeLabel = theme === "dark" ? "Oscuro" : "Claro";
  return `Modo manual: ${modeLabel} • Clic para alternar / restaurar automático`;
}

interface KioskTopbarProps {
  kioskName?: string;
  locationName?: string;
  isOnline: boolean;
  offlineQueueLength: number;
  cameraFacing: "environment" | "user";
  soundEnabled: boolean;
  isFullscreen: boolean;
  mounted: boolean;
  isAuto: boolean;
  theme: string | undefined;
  onToggleCameraFacing: () => void;
  onToggleSound: () => void;
  onToggleFullscreen: () => void;
  onToggleTheme: () => void;
  onOpenConfig: () => void;
}

/**
 * Top bar for the kiosk terminal with connectivity status and peripheral toggles.
 */
export function KioskTopbar({
  kioskName,
  locationName,
  isOnline,
  offlineQueueLength,
  cameraFacing,
  soundEnabled,
  isFullscreen,
  mounted,
  isAuto,
  theme,
  onToggleCameraFacing,
  onToggleSound,
  onToggleFullscreen,
  onToggleTheme,
  onOpenConfig,
}: KioskTopbarProps) {
  return (
    <header className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.06] bg-white/90 dark:bg-command-bg/70 backdrop-blur-xl z-30 transition-colors duration-500">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600/20 to-primary-400/10 dark:from-primary-600/30 dark:to-primary-400/20 border border-primary-500/30 dark:border-primary-400/40 shadow-sm dark:shadow-[0_0_25px_-4px_rgba(0,166,80,0.35)]">
            <ScanLine className="w-5 h-5 text-primary-500 dark:text-primary-400" aria-hidden="true" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary-400 rounded-full animate-ping motion-reduce:animate-none"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                PRESEN<span className="text-primary-600 dark:text-primary-400">X</span>A
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-primary-500/10 dark:bg-primary-500/15 text-primary-700 dark:text-primary-400 border border-primary-500/20 dark:border-primary-500/30 shadow-sm">
                Tablet Kiosk
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              <Building className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
              <span>{locationName || "Sede Principal"}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-slate-600 dark:text-slate-300">{kioskName || "Terminal 01"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <StatusBadge
            status={isOnline ? "ACTIVO" : "OFFLINE"}
            label={isOnline ? "En Línea · Sync 10s" : "Sin Conexión"}
          />
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/5 text-xs text-slate-600 dark:text-slate-400 font-mono transition-colors">
          <RefreshCw
            className={`w-3.5 h-3.5 ${offlineQueueLength > 0 && isOnline ? "animate-spin text-primary-600 dark:text-primary-400" : "text-slate-400"
              }`}
          />
          <span>
            Cola:{" "}
            <strong className={offlineQueueLength > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-200"}>
              {offlineQueueLength} pt.
            </strong>
          </span>
        </div>
        <div className="h-5 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>

        <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/90 dark:border-white/10 shadow-sm dark:shadow-none transition-colors">
          <button
            type="button"
            onClick={onToggleCameraFacing}
            aria-label={`Alternar cámara a ${cameraFacing === "environment" ? "frontal" : "trasera"}`}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary-500/10 hover:bg-primary-500/20 text-primary-700 dark:text-primary-300 border border-primary-500/20 dark:border-primary-500/25 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            title={`Alternar Vista de Cámara a ${cameraFacing === "environment" ? "Frontal" : "Trasera"}`}
          >
            <SwitchCamera className="w-4 h-4" aria-hidden="true" />
            <span className="hidden lg:inline">
              {cameraFacing === "environment" ? "Cámara Trasera" : "Cámara Frontal"}
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? "Silenciar sonido del kiosk" : "Activar sonido del kiosk"}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            title={soundEnabled ? "Silenciar" : "Activar sonido"}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            ) : (
              <VolumeX className="w-4 h-4 text-rose-500 dark:text-rose-400" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Salir de pantalla completa" : "Activar pantalla completa"}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            title="Modo Pantalla Completa"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" aria-hidden="true" /> : <Maximize className="w-4 h-4" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={getThemeToggleTitle(mounted, isAuto, theme)}
            suppressHydrationWarning
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            title={getThemeToggleTitle(mounted, isAuto, theme)}
          >
            {mounted && theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-500" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={onOpenConfig}
            aria-label="Ajustes de terminal y calibración"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            title="Ajustes de Terminal y Calibración"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

interface KioskScannerHudProps {
  lastScanResult: ScanCelebrationData | null;
  scanError: string | null;
  countdown: number;
  totalDuration: number;
  isFocusing: boolean;
  focusPoint: { x: number; y: number } | null;
  zoomLevel: number;
  zoomCapabilities: { min: number; max: number; step: number } | null;
  onDismissResult: () => void;
  onClearError: () => void;
  onTriggerFocus: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onToggleCameraFacing: () => void;
  onSetZoom: (level: number) => void;
}

const ZOOM_LEVELS = [1, 1.5, 2, 2.5, 3];

/**
 * Right-side kiosk scanner section rendering scan celebration, error state, or active QR HUD.
 */
export function KioskScannerHud({
  lastScanResult,
  scanError,
  countdown,
  totalDuration,
  isFocusing,
  focusPoint,
  zoomLevel,
  zoomCapabilities,
  onDismissResult,
  onClearError,
  onTriggerFocus,
  onToggleCameraFacing,
  onSetZoom,
}: KioskScannerHudProps) {
  if (lastScanResult) {
    return (
      <section className="lg:col-span-6 flex flex-col items-center justify-center relative w-full h-full min-h-[400px]">
        <div className="w-full max-w-md animate-[scale-up_0.3s_ease-out]">
          <ScanCelebrationCard
            data={lastScanResult}
            countdown={countdown}
            totalDuration={totalDuration}
            onDismiss={onDismissResult}
          />
        </div>
      </section>
    );
  }

  if (scanError) {
    return (
      <section className="lg:col-span-6 flex flex-col items-center justify-center relative w-full h-full min-h-[400px]">
        <div className="w-full max-w-[460px] rounded-3xl p-8 bg-rose-50/90 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-500/40 backdrop-blur-md shadow-2xl flex flex-col items-center text-center animate-[shake_0.3s_ease-in-out]">
          <div className="p-4 rounded-3xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 mb-4 shadow-sm dark:shadow-[0_0_20px_rgba(244,63,94,0.4)]">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Código Inválido o No Reconocido
          </h3>
          <p className="text-sm text-rose-700 dark:text-rose-300 leading-relaxed mb-6 font-medium">
            {scanError}
          </p>
          <button
            onClick={onClearError}
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20 border border-transparent dark:border-white/20 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Reintentar Escaneo
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="lg:col-span-6 flex flex-col items-center justify-center relative w-full h-full min-h-[400px]">
      <div className="w-full flex flex-col items-center">
        <div
          className="relative w-full max-w-[460px] aspect-[4/3.8] rounded-3xl bg-white dark:bg-black/80 p-3.5 shadow-2xl shadow-slate-300/60 dark:shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-slate-200/90 dark:border-white/10 backdrop-blur-md cursor-pointer group transition-all"
          onClick={onTriggerFocus}
        >
          <div className="absolute -inset-0.5 rounded-[26px] bg-gradient-to-b from-primary-500/30 via-transparent to-primary-600/20 dark:from-primary-400/40 dark:via-transparent dark:to-primary-600/30 -z-10 blur-sm opacity-60 pointer-events-none"></div>

          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-black/10 dark:border-white/15">
            <div
              id="qr-reader"
              className="absolute inset-0 w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
            />

            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14]/90 via-transparent to-[#0b0e14]/60 pointer-events-none"></div>

            <div className="absolute inset-8 pointer-events-none flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="w-8 h-8 border-t-[3.5px] border-l-[3.5px] border-primary-400 rounded-tl-lg shadow-[0_0_12px_rgba(0,166,80,0.8)]"></div>
                <div className="w-8 h-8 border-t-[3.5px] border-r-[3.5px] border-primary-400 rounded-tr-lg shadow-[0_0_12px_rgba(0,166,80,0.8)]"></div>
              </div>
              <div className="flex justify-between">
                <div className="w-8 h-8 border-b-[3.5px] border-l-[3.5px] border-primary-400 rounded-bl-lg shadow-[0_0_12px_rgba(0,166,80,0.8)]"></div>
                <div className="w-8 h-8 border-b-[3.5px] border-r-[3.5px] border-primary-400 rounded-br-lg shadow-[0_0_12px_rgba(0,166,80,0.8)]"></div>
              </div>
            </div>

            <div className="absolute left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-primary-400 to-transparent shadow-[0_0_14px_4px_rgba(0,166,80,0.7)] scanner-line pointer-events-none motion-reduce:hidden"></div>

            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs text-white font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse motion-reduce:animate-none"></span>
                <span>HD 1080p · {isFocusing ? "Enfocando..." : "Activa"}</span>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs text-primary-400 font-mono tracking-wider">
                {zoomLevel > 1 ? `ZOOM ${zoomLevel}x` : "AUTO-FOCUS"}
              </div>
            </div>

            <div className="absolute flex flex-col items-center justify-center pointer-events-none space-y-2 opacity-50 group-hover:opacity-100 transition-opacity">
              <div
                className={`w-16 h-16 rounded-full border flex items-center justify-center ${isFocusing ? "border-primary-400 animate-ping motion-reduce:animate-none" : "border-primary-400/40 animate-pulse motion-reduce:animate-none"
                  }`}
              >
                <Camera className="w-6 h-6 text-primary-400/80" aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold tracking-wider uppercase text-white/90 bg-black/70 px-3 py-1 rounded-md border border-white/10">
                {isFocusing ? "Enfocando..." : "Centra tu código QR"}
              </span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTriggerFocus();
                }}
                aria-label="Re-enfocar cámara"
                className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/15 text-xs text-slate-100 transition-colors cursor-pointer"
              >
                <Focus className="w-4 h-4 text-primary-400" aria-hidden="true" />
                <span>Re-enfocar</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCameraFacing();
                }}
                aria-label="Cambiar cámara frontal o trasera"
                className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/15 text-xs text-primary-300 transition-colors cursor-pointer"
              >
                <SwitchCamera className="w-4 h-4" aria-hidden="true" />
                <span>Cambiar</span>
              </button>
            </div>

            {isFocusing && focusPoint && (
              <div
                className="absolute pointer-events-none w-12 h-12 border-2 border-primary-400 rounded-xl animate-ping motion-reduce:animate-none flex items-center justify-center"
                style={{ left: focusPoint.x - 24, top: focusPoint.y - 24 }}
              >
                <div className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <ScanLine className="w-4 h-4 text-primary-600 dark:text-primary-400 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
            <span>
              Sensor óptico continuo activo: <strong>Detectando colaborador...</strong>
            </span>
          </div>
          {zoomCapabilities && (
            <div className="flex items-center gap-1 mt-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1 shadow-sm dark:shadow-none">
              {ZOOM_LEVELS.filter((z) => z <= zoomCapabilities.max).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => onSetZoom(lvl)}
                  aria-label={`Zoom ${lvl}x`}
                  aria-pressed={zoomLevel === lvl}
                  className={`min-w-[44px] min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${zoomLevel === lvl
                      ? "bg-primary-500 text-white dark:bg-primary-400 dark:text-[#07090e] shadow-sm"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                >
                  {lvl}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
