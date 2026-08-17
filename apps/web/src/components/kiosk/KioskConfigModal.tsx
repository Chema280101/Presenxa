"use client";

import { useState } from "react";
import { X, Key, Shield, Smartphone, QrCode, Loader2 } from "lucide-react";

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
  const [apiKey, setApiKey] = useState(currentKey);
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
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
                Configuración y activación inicial de la pantalla o tablet
              </p>
            </div>
          </div>
          {currentKey && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} id="kiosk-config-form" className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5 custom-scrollbar">
          {error && (
            <div className="px-4 py-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
              <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0 animate-ping" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-2xl p-5 bg-white/[0.02] border border-white/10 space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              API Key o Clave Secreta del Kiosk <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: f47ac10b-58cc-4372-a567-0e02b2c3d479"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-slate-500 font-mono text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
            />
            <p className="text-xs text-slate-400 leading-relaxed">
              Puedes generar y copiar esta clave ingresando al <strong>Panel Administrativo &rarr; Kiosks</strong>.
            </p>
          </div>
        </form>

        {/* Footer - Fixed Bottom */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/30 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
          {currentKey ? (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          ) : (
            <div />
          )}
          <button
            type="submit"
            form="kiosk-config-form"
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
        </div>
      </div>
    </div>
  );
}
