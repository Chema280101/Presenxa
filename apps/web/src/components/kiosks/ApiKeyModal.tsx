"use client";

import { useState } from "react";
import {
  X,
  Key,
  Copy,
  Check,
  RefreshCw,
  Shield,
  Smartphone,
  AlertTriangle,
  QrCode,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect } from "react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  kiosk: {
    id: string;
    name: string;
    locationName?: string;
    apiKey: string;
  } | null;
  onRegenerateKey: (kioskId: string) => Promise<string | null>;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  kiosk,
  onRegenerateKey,
}: ApiKeyModalProps) {
  const [copied, setCopied] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [pairingQrUrl, setPairingQrUrl] = useState<string>("");

  const currentKey = kiosk?.apiKey || "";

  useEffect(() => {
    if (!currentKey) return;

    // Generate pairing JSON payload for fast QR scanner pairing on tablets
    const payload = JSON.stringify({
      kioskId: kiosk?.id,
      apiKey: currentKey,
      kioskName: kiosk?.name,
    });

    QRCode.toDataURL(payload, {
      width: 250,
      margin: 1,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    })
      .then((url) => setPairingQrUrl(url))
      .catch((err) => console.error("Error generating pairing QR:", err));
  }, [currentKey, kiosk]);

  if (!isOpen || !kiosk) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(kiosk.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRotate = async () => {
    if (
      !confirm(
        "¿Estás seguro de rotar la API Key? El dispositivo Kiosk físico desconectará su sesión hasta que ingreses la nueva clave."
      )
    )
      return;

    setIsRotating(true);
    try {
      await onRegenerateKey(kiosk.id);
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-[fade-in_0.2s_ease-out]">
      <div className="relative w-full max-w-md rounded-3xl p-6 glass border border-white/10 shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Clave de Vinculación (API Key)
              </h3>
              <p className="text-xs text-slate-400">
                {kiosk.name} {kiosk.locationName ? `· ${kiosk.locationName}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pairing QR Container */}
        <div className="my-5 flex flex-col items-center">
          <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-200">
            {pairingQrUrl ? (
              <img src={pairingQrUrl} alt="Pairing QR" className="w-40 h-40" />
            ) : (
              <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-400">
                Generando QR de vinculación...
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">
            Escanea desde la App del Kiosk para emparejar automáticamente
          </p>
        </div>

        {/* API Key Box */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Clave Secreta del Dispositivo
          </label>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="font-mono text-xs text-pink-300 truncate mr-2">
              {kiosk.apiKey}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors flex-shrink-0"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? "Copiado" : "Copiar"}</span>
            </button>
          </div>
        </div>

        {/* Security Warning */}
        <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
          <p className="leading-relaxed">
            Esta clave autentica las marcaciones físicas en la puerta de entrada. No
            la compartas públicamente.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-5">
          <button
            onClick={handleRotate}
            disabled={isRotating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRotating ? "animate-spin" : ""}`}
            />
            <span>Rotar Clave</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
