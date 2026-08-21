"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [pairingQrUrl, setPairingQrUrl] = useState<string>("");

  const currentKey = kiosk?.apiKey || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

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
      color: { dark: "#060E17", light: "#FFFFFF" },
    })
      .then((url) => setPairingQrUrl(url))
      .catch((err) => console.error("Error generating pairing QR:", err));
  }, [currentKey, kiosk]);

  if (!isOpen || !kiosk || !mounted) return null;

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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-surface-950/80 backdrop-blur-md overflow-hidden animate-fade-in-up">
      <div 
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl border border-primary-400/20 shadow-2xl shadow-black/90 my-auto overflow-hidden animate-scale-up"
        style={{ background: "rgba(10, 27, 44, 0.98)", backdropFilter: "blur(24px)" }}
      >
        {/* Header - Fixed Top */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-surface-950/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary-400/15 text-primary-300 ring-1 ring-primary-400/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Clave de Vinculación (API Key)
              </h3>
              <p className="text-xs text-slate-400">
                {kiosk.name} {kiosk.locationName ? `· ${kiosk.locationName}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Pairing QR Container */}
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-200">
              {pairingQrUrl ? (
                <img src={pairingQrUrl} alt="Pairing QR" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                  Generando QR de vinculación...
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2.5 text-center">
              Escanea desde la App del Kiosk para emparejar automáticamente la tablet
            </p>
          </div>

          {/* API Key Box */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Clave Secreta del Dispositivo
            </label>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-950/60 border border-white/10">
              <span className="font-mono text-xs text-primary-300 truncate mr-2">
                {kiosk.apiKey}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors flex-shrink-0 cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-primary-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? "Copiado" : "Copiar"}</span>
              </button>
            </div>
          </div>

          {/* Security Warning */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
            <p className="leading-relaxed">
              Esta clave autentica las marcaciones físicas en la puerta de entrada. No
              la compartas con personas no autorizadas.
            </p>
          </div>
        </div>

        {/* Actions - Fixed Bottom */}
        <div className="px-6 py-4 border-t border-white/10 bg-surface-950/60 flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleRotate}
            disabled={isRotating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRotating ? "animate-spin" : ""}`}
            />
            <span>Rotar Clave</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
