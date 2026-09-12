"use client";

import { useState, useEffect } from "react";
import {
  Key,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import QRCode from "qrcode";
import { useConfirm } from "@/providers/ConfirmDialogProvider";
import { ModalShell } from "@/components/ui/ModalShell";

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
  const { confirm } = useConfirm();

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
      color: { dark: "#060E17", light: "#FFFFFF" },
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
    const ok = await confirm({
      title: "¿Rotar API Key del Kiosk?",
      description:
        "¿Estás seguro de rotar la clave de este Kiosk? El dispositivo físico desconectará su sesión de inmediato hasta que ingreses o escanees la nueva clave.",
      confirmText: "Rotar Clave",
      variant: "warning",
    });
    if (!ok) return;

    setIsRotating(true);
    try {
      await onRegenerateKey(kiosk.id);
    } finally {
      setIsRotating(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-between w-full">
      <button
        onClick={handleRotate}
        disabled={isRotating}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-danger-50 dark:bg-danger-500/15 hover:bg-danger-100 dark:hover:bg-danger-500/25 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-500/30 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${isRotating ? "animate-spin" : ""}`}
        />
        <span>Rotar Clave</span>
      </button>

      <button
        onClick={onClose}
        className="h-10 px-6 rounded-xl bg-surface-100 dark:bg-white/10 hover:bg-surface-200 dark:hover:bg-white/15 text-surface-900 dark:text-white font-semibold text-sm transition-colors cursor-pointer"
      >
        Cerrar
      </button>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Clave de Vinculación (API Key)"
      description={`${kiosk.name} ${kiosk.locationName ? `· ${kiosk.locationName}` : ""}`}
      icon={Key}
      iconVariant="primary"
      maxWidth="md"
      footer={footer}
    >
      <div className="flex flex-col py-2 space-y-5">
        <div className="flex flex-col items-center">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-surface-200 dark:border-transparent">
            {pairingQrUrl ? (
              <img src={pairingQrUrl} alt="Pairing QR" className="w-48 h-48" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-xs text-surface-400">
                Generando QR de vinculación...
              </div>
            )}
          </div>
          <p className="text-xs text-surface-500 dark:text-slate-400 mt-2.5 text-center">
            Escanea desde la App del Kiosk para emparejar automáticamente la tablet
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-surface-900 dark:text-slate-300">
            Clave Secreta del Dispositivo
          </label>
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-50 dark:bg-[#1A2333] border border-surface-200 dark:border-white/10">
            <span className="font-mono text-xs text-primary-600 dark:text-primary-300 truncate mr-2">
              {kiosk.apiKey}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-surface-200 dark:border-transparent hover:bg-surface-100 dark:hover:bg-white/20 text-surface-700 dark:text-slate-200 transition-colors flex-shrink-0 cursor-pointer shadow-sm"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-primary-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? "Copiado" : "Copiar"}</span>
            </button>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/20 flex items-start gap-3 text-xs text-warning-800 dark:text-warning-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-warning-500 dark:text-warning-400" />
          <p className="leading-relaxed">
            Esta clave autentica las marcaciones físicas en la puerta de entrada. No
            la compartas con personas no autorizadas.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
