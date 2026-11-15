"use client";

import { useEffect, useRef } from "react";
import { Clock, RefreshCw, ShieldCheck, X, ZoomIn } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { UserProfile } from "./types";

interface QrZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  qrDataUrl: string | null;
  qrSecondsLeft: number;
}

function QrZoomModal({
  isOpen,
  onClose,
  profile,
  qrDataUrl,
  qrSecondsLeft,
}: Readonly<QrZoomModalProps>) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-zoom-modal-title"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-2xl"
    >
      <button
        type="button"
        aria-label="Cerrar vista ampliada"
        onClick={onClose}
        className="absolute inset-0 w-full h-full cursor-default"
        tabIndex={-1}
      />

      {/* Top action bar */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-10">
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar vista ampliada"
          className="min-w-[44px] min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-danger-500 text-white border border-white/15 hover:border-danger-500 transition-all shadow-lg active:scale-95 flex items-center gap-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="w-5 h-5" aria-hidden="true" />
          <span className="hidden sm:inline">Cerrar (Esc)</span>
        </button>
      </div>

      <div className="relative z-10 w-full max-w-sm sm:max-w-md rounded-3xl p-6 sm:p-7 bg-white text-surface-950 shadow-2xl flex flex-col items-center text-center">
        <div className="w-full mb-2">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <ShieldCheck className="w-4 h-4 text-primary-600" aria-hidden="true" />
            <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-primary-700">
              CREDENCIAL OFICIAL KIOSK
            </span>
          </div>
          <h2
            id="qr-zoom-modal-title"
            className="text-xl sm:text-2xl font-black text-surface-900 tracking-tight"
          >
            {profile?.firstName} {profile?.lastName}
          </h2>
          <p className="text-xs text-surface-600 font-semibold mt-0.5">
            {profile?.role} {profile?.documentId ? `· DNI: ${profile.documentId}` : ""}
          </p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-4 border-surface-900 shadow-2xl my-2 w-full flex items-center justify-center relative select-none">
          <div
            aria-hidden="true"
            className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-primary-500 to-transparent z-20 pointer-events-none opacity-90 shadow-[0_0_12px_#00a650] animate-[scanline_2s_ease-in-out_infinite_alternate] motion-reduce:hidden"
          />
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Código QR de Asistencia"
              className="w-72 h-72 sm:w-80 sm:h-80 object-contain rounded-lg"
            />
          ) : (
            <div className="w-72 h-72 flex flex-col items-center justify-center text-surface-400">
              <RefreshCw className="w-8 h-8 animate-spin motion-reduce:animate-none mb-2 text-primary-500" aria-hidden="true" />
              <span className="text-xs">Cargando credencial...</span>
            </div>
          )}
        </div>

        <div className="w-full mt-2 p-2.5 rounded-xl bg-surface-50 border border-surface-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-primary-700 font-bold">
            <Clock className="w-4 h-4 text-primary-600" aria-hidden="true" />
            <span>Rotación Anti-Captura</span>
          </div>
          <span className="font-mono font-extrabold text-primary-700 px-2 py-0.5 rounded bg-primary-100 border border-primary-200">
            {qrSecondsLeft}s restantes
          </span>
        </div>

        <div className="w-full mt-3 space-y-0.5">
          <p className="text-xs font-bold text-surface-900">
            Coloca la pantalla a unos 15–20 cm del lector del Kiosk
          </p>
          <p className="text-xs text-surface-500">
            {profile?.location?.name ? `Sede Asignada: ${profile.location.name}` : "Presenxa Smart Attendance"}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 min-h-[44px] py-3 rounded-2xl bg-surface-900 hover:bg-surface-800 text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          Cerrar Pantalla Completa
        </button>
      </div>
    </div>
  );
}

interface QrCredentialCardProps {
  profile: UserProfile | null;
  qrDataUrl: string | null;
  qrSecondsLeft: number;
  isRegeneratingQr: boolean;
  isZoomOpen: boolean;
  onOpenZoom: () => void;
  onCloseZoom: () => void;
  onRegenerateQr: () => void;
  isLoading: boolean;
}

export function QrCredentialCard({
  profile,
  qrDataUrl,
  qrSecondsLeft,
  isRegeneratingQr,
  isZoomOpen,
  onOpenZoom,
  onCloseZoom,
  onRegenerateQr,
  isLoading,
}: Readonly<QrCredentialCardProps>) {
  if (isLoading && !profile) {
    return (
      <div className="rounded-3xl p-5 sm:p-6 border bg-white border-surface-200 dark:bg-command-card dark:border-white/10 shadow-sm space-y-5">
        <div className="space-y-2 pb-4 border-b border-surface-100 dark:border-white/5">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex flex-col items-center space-y-3">
          <Skeleton className="w-64 h-64 sm:w-72 sm:h-72 rounded-2xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <section
        aria-label="Credencial digital QR"
        className="rounded-3xl p-5 sm:p-6 border relative overflow-hidden transition-colors shadow-sm bg-white border-surface-200 dark:bg-command-card dark:border-primary-500/30 dark:shadow-[0_0_35px_2px_rgba(0,166,80,0.12)]"
      >
        <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest text-primary-600 dark:text-primary-400 uppercase">
                CREDENCIAL DIGITAL
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" aria-hidden="true" />
            </div>
            <h2 className="text-base font-bold mt-0.5 text-surface-900 dark:text-white">
              {profile?.location?.name || "Sede Asignada"}
            </h2>
          </div>
        </div>

        <div className="my-5 relative flex flex-col items-center">
          <button
            type="button"
            aria-label="Ampliar código QR en pantalla completa"
            className="relative bg-white p-4 sm:p-5 rounded-2xl shadow-xl border-4 border-surface-200 dark:border-surface-800 group transition duration-300 cursor-pointer block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500"
            onClick={onOpenZoom}
          >
            <div
              aria-hidden="true"
              className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary-500 to-transparent z-20 pointer-events-none opacity-90 shadow-[0_0_12px_#00a650] animate-[scanline_2.8s_ease-in-out_infinite_alternate] motion-reduce:hidden"
            />
            <style>{`@keyframes scanline { 0% { transform: translateY(0%); opacity: 0.8; } 50% { opacity: 1; } 100% { transform: translateY(220px); opacity: 0.8; } }`}</style>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Código QR personal de asistencia"
                className="w-60 h-60 sm:w-68 sm:h-68 object-contain select-none pointer-events-none"
              />
            ) : (
              <div className="w-60 h-60 flex flex-col items-center justify-center text-surface-400">
                <RefreshCw className="w-8 h-8 animate-spin motion-reduce:animate-none mb-2 text-primary-500" aria-hidden="true" />
                <span className="text-xs">Generando QR...</span>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenZoom}
            className="mt-3 w-full min-h-[44px] py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition bg-surface-100 hover:bg-surface-200 text-surface-800 border-surface-200 dark:bg-command-bg dark:hover:bg-surface-800 dark:text-primary-400 dark:border-primary-500/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          >
            <ZoomIn className="w-4 h-4" aria-hidden="true" />
            Toca para ampliar QR
          </button>
        </div>

        <div className="mt-4 p-3.5 rounded-2xl border space-y-2 bg-surface-50 border-surface-200 dark:bg-surface-900/80 dark:border-white/10">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400 font-semibold">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>QR Dinámico Anti-Capturas</span>
            </div>
            <div className="flex items-center gap-1 font-mono font-bold text-primary-700 dark:text-primary-400">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{qrSecondsLeft}s</span>
            </div>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-surface-200 dark:bg-surface-800">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-300 rounded-full transition-all duration-1000 ease-linear motion-reduce:transition-none"
              style={{ width: `${(qrSecondsLeft / 30) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-4 text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border bg-surface-100 border-surface-200 text-surface-800 dark:bg-surface-900 dark:border-white/10 dark:text-white">
            <span className="text-xs font-mono font-bold text-surface-500 dark:text-surface-400">
              DNI:
            </span>
            <span className="text-xs font-mono font-extrabold tracking-wider">
              {profile?.documentId || "---"}
            </span>
          </div>
          <p className="text-xs max-w-xs mx-auto leading-relaxed text-surface-600 dark:text-surface-400">
            Muestra este código frente al Kiosk de la entrada para registrar tu ingreso o salida.
          </p>
          <button
            type="button"
            onClick={onRegenerateQr}
            disabled={isRegeneratingQr}
            className="mt-1 inline-flex items-center justify-center gap-2 min-h-[44px] text-xs font-semibold text-primary-700 dark:text-primary-400 hover:text-primary-600 transition py-2 px-4 rounded-xl hover:bg-primary-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRegeneratingQr ? "animate-spin motion-reduce:animate-none" : ""}`}
              aria-hidden="true"
            />
            {isRegeneratingQr ? "Renovando QR..." : "Regenerar código QR seguro"}
          </button>
        </div>
      </section>

      <QrZoomModal
        isOpen={isZoomOpen}
        onClose={onCloseZoom}
        profile={profile}
        qrDataUrl={qrDataUrl}
        qrSecondsLeft={qrSecondsLeft}
      />
    </>
  );
}
