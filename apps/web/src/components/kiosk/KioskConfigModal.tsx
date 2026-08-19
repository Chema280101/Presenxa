"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Key,
  QrCode,
  Keyboard,
  Camera,
  SwitchCamera,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface KioskConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveKey: (apiKey: string) => Promise<boolean>;
  currentKey?: string;
}

export function KioskConfigModal({
  isOpen,
  onClose,
  onSaveKey,
  currentKey = "",
}: KioskConfigModalProps) {
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [apiKey, setApiKey] = useState(currentKey);
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerRef = useRef<any>(null);

  useEffect(() => {
    setApiKey(currentKey);
    setError("");
    setCameraError(null);
  }, [currentKey, isOpen]);

  // Clean up scanner on unmount or modal close or mode change
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.warn("Error stopping config scanner:", err);
      } finally {
        scannerRef.current = null;
      }
    }
  };

  // Start QR scanner when modal is open and mode === "scan"
  useEffect(() => {
    let isCancelled = false;

    const startScanner = async () => {
      if (!isOpen || mode !== "scan") return;

      // Small delay to ensure DOM element is mounted
      await new Promise((r) => setTimeout(r, 150));
      if (isCancelled) return;

      const element = document.getElementById("kiosk-pairing-qr-reader");
      if (!element) return;

      try {
        await stopScanner();
        if (isCancelled) return;

        const { Html5Qrcode } = await import("html5-qrcode");
        const html5QrCode = new Html5Qrcode("kiosk-pairing-qr-reader", {
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: cameraFacing },
          config,
          (decodedText: string) => {
            handleDetectedCode(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        if (!isCancelled) {
          console.warn("Could not start pairing camera:", err);
          setCameraError("No se pudo iniciar la cámara. Puedes usar la opción de Clave Manual.");
        }
      }
    };

    if (isOpen && mode === "scan") {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      isCancelled = true;
      stopScanner();
    };
  }, [isOpen, mode, cameraFacing]);

  const handleDetectedCode = async (decodedText: string) => {
    let keyToUse = decodedText.trim();

    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.apiKey) {
        keyToUse = parsed.apiKey.trim();
      }
    } catch {
      // Raw key text
    }

    if (!keyToUse) return;

    // Pause scanner to avoid repeated calls
    await stopScanner();

    setApiKey(keyToUse);
    setIsValidating(true);
    setError("");

    try {
      const valid = await onSaveKey(keyToUse);
      if (valid) {
        onClose();
      } else {
        setError("Clave de Kiosk inválida o no reconocida por el servidor");
      }
    } catch (err: any) {
      setError(err.message || "Error al validar la clave del Kiosk");
    } finally {
      setIsValidating(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError("Por favor ingresa una clave de API válida");
      return;
    }

    setIsValidating(true);
    setError("");

    try {
      const valid = await onSaveKey(apiKey.trim());
      if (valid) {
        onClose();
      } else {
        setError("Clave de Kiosk inválida o no reconocida por el servidor");
      }
    } catch (err: any) {
      setError(err.message || "Error al validar la clave del Kiosk");
    } finally {
      setIsValidating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/85 backdrop-blur-lg overflow-hidden animate-[fade-in_0.2s_ease-out]">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl glass border border-white/15 shadow-2xl shadow-black/80 my-auto overflow-hidden">
        {/* Header - Fixed Top */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                Vincular Dispositivo Kiosk
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configuración y activación de la pantalla o tablet
              </p>
            </div>
          </div>
          {currentKey && (
            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setError("");
                setMode("scan");
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                mode === "scan"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Escanear QR</span>
            </button>
            <button
              type="button"
              onClick={() => {
                stopScanner();
                setError("");
                setMode("manual");
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                mode === "manual"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>Digitar Clave</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {error && (
            <div className="px-4 py-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {mode === "scan" ? (
            /* Mode 1: QR Camera Scanner */
            <div className="flex flex-col items-center space-y-3">
              <div className="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-black/60 border-2 border-dashed border-emerald-500/40 flex items-center justify-center shadow-inner">
                <div id="kiosk-pairing-qr-reader" className="w-full h-full" />

                {isValidating && (
                  <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white z-20">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    <p className="text-xs font-semibold">Validando vinculación...</p>
                  </div>
                )}
              </div>

              {cameraError ? (
                <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  <p>{cameraError}</p>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full max-w-[280px] px-1">
                  <p className="text-[11px] text-slate-400 text-center flex-1">
                    Apunta la cámara al <strong>QR de vinculación</strong> del Panel Administrativo &rarr; Kiosks
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setCameraFacing((prev) => (prev === "environment" ? "user" : "environment"))
                    }
                    className="p-2 ml-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                    title="Cambiar cámara (frontal / trasera)"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Mode 2: Manual Key Form */
            <form onSubmit={handleManualSubmit} id="kiosk-manual-form" className="space-y-4">
              <div className="rounded-2xl p-4 bg-white/[0.02] border border-white/10 space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  API Key o Clave Secreta del Kiosk <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Ej: f47ac10b-58cc-4372-a567-0e02b2c3d479"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-slate-500 font-mono text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Puedes copiar esta clave ingresando al <strong>Panel Administrativo &rarr; Kiosks</strong> &rarr; Ver Clave.
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Footer - Fixed Bottom */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/30 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
          {currentKey ? (
            <button
              type="button"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          ) : (
            <div />
          )}

          {mode === "manual" ? (
            <button
              type="submit"
              form="kiosk-manual-form"
              disabled={isValidating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Guardar y Conectar"
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                stopScanner();
                setMode("manual");
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Digitar manualmente</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
