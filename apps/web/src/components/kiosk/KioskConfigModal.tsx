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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-[fade-in_0.2s_ease-out]">
      <div className="relative w-full max-w-md rounded-3xl p-8 glass border border-white/15 shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Vincular Dispositivo Kiosk
              </h3>
              <p className="text-xs text-slate-400">
                Configuración inicial de la Tablet o Pantalla
              </p>
            </div>
          </div>
          {currentKey && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              API Key del Kiosk
            </label>
            <input
              type="text"
              required
              placeholder="Ej: f47ac10b-58cc-4372-a567-0e02b2c3d479"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-white placeholder-slate-500 font-mono text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-2">
              Puedes obtener esta clave desde el <strong>Panel Admin &rarr; Kiosks</strong>.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-6">
            {currentKey && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isValidating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
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
        </form>
      </div>
    </div>
  );
}
