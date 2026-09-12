"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { QrCode, Download, RefreshCw, Copy, Check, Printer, Shield } from "lucide-react";
import { useConfirm } from "@/providers/ConfirmDialogProvider";
import { ModalShell } from "@/components/ui/ModalShell";

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    documentId?: string | null;
    qrToken: string;
    signedQrPayload?: string | null;
    locationName?: string | null;
  } | null;
  onRegenerateQr: (userId: string) => Promise<string | null>;
}

export function QrModal({ isOpen, onClose, user, onRegenerateQr }: QrModalProps) {
  const { confirm } = useConfirm();
  const [dataUrl, setDataUrl] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const payloadToEncode = user?.signedQrPayload || user?.qrToken || "";

  useEffect(() => {
    if (!payloadToEncode) return;

    QRCode.toDataURL(payloadToEncode, {
      width: 400,
      margin: 2,
      color: {
        dark: "#060E17",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error("Error generating QR:", err));
  }, [payloadToEncode]);

  if (!isOpen || !user) return null;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(user.qrToken);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `QR_${user.firstName}_${user.lastName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const win = window.open("", "", "width=600,height=700");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Credencial QR - ${user.firstName} ${user.lastName}</title>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fff; }
            .badge { border: 2px solid #102a43; border-radius: 16px; padding: 24px; text-align: center; width: 320px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .org { font-size: 14px; font-weight: bold; color: #102a43; text-transform: uppercase; margin-bottom: 4px; }
            .name { font-size: 20px; font-weight: bold; color: #060e17; margin: 8px 0 2px; }
            .role { font-size: 13px; color: #64748b; margin-bottom: 16px; font-weight: 500; }
            .qr-img { width: 220px; height: 220px; margin: 0 auto 12px; display: block; }
            .token { font-size: 10px; font-family: monospace; color: #94a3b8; word-break: break-all; }
            .footer { font-size: 11px; color: #64748b; margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="badge">
            <div class="org">Presenxa ID</div>
            <div class="name">${user.firstName} ${user.lastName}</div>
            <div class="role">${user.role} ${user.documentId ? `· Doc: ${user.documentId}` : ""}</div>
            <img class="qr-img" src="${dataUrl}" alt="QR" />
            <div class="token">TOKEN: ${user.qrToken}</div>
            <div class="footer">Escanee en el kiosco de acceso para registrar asistencia</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleRegenerate = async () => {
    const ok = await confirm({
      title: "¿Regenerar código QR?",
      description:
        "¿Estás seguro de generar un nuevo código QR? El código QR anterior del colaborador dejará de funcionar de inmediato.",
      confirmText: "Regenerar QR",
      variant: "danger",
    });
    if (!ok) return;

    setIsRegenerating(true);
    try {
      await onRegenerateQr(user.id);
    } finally {
      setIsRegenerating(false);
    }
  };

  const footer = (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <button
        onClick={handleDownload}
        disabled={!dataUrl}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 hover:bg-primary-100 dark:hover:bg-primary-500/20 text-primary-700 dark:text-primary-300 text-xs font-bold transition-all cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        Descargar
      </button>
      <button
        onClick={handlePrint}
        disabled={!dataUrl}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-surface-100 dark:bg-white/5 border border-surface-200 dark:border-white/10 hover:bg-surface-200 dark:hover:bg-white/10 text-surface-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
      >
        <Printer className="w-3.5 h-3.5" />
        Imprimir
      </button>
      <button
        onClick={handleRegenerate}
        disabled={isRegenerating}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20 hover:bg-danger-100 dark:hover:bg-danger-500/20 text-danger-700 dark:text-danger-300 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
        Regenerar
      </button>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Credencial QR Digital"
      description="Pase oficial para marcaciones en kiosco"
      icon={QrCode}
      iconVariant="primary"
      maxWidth="md"
      footer={footer}
    >
      <div className="flex flex-col items-center py-2 space-y-5">
        <div ref={printRef} className="w-full bg-white dark:bg-[#1A2333] rounded-2xl p-6 flex flex-col items-center shadow-sm border border-surface-200 dark:border-white/10">
          <div className="flex items-center gap-1.5 text-xs font-bold text-surface-900 dark:text-white tracking-wider uppercase mb-1">
            <Shield className="w-3.5 h-3.5 text-primary-500" />
            Presenxa · Pase Oficial
          </div>
          <h4 className="text-xl font-black text-surface-900 dark:text-white text-center leading-tight">
            {user.firstName} {user.lastName}
          </h4>
          <p className="text-xs text-surface-500 dark:text-slate-400 font-medium capitalize mb-3">
            {user.role.toLowerCase()} {user.locationName ? `• ${user.locationName}` : ""}
          </p>

          <div className="bg-surface-50 dark:bg-white p-4 rounded-2xl border border-surface-200 dark:border-transparent shadow-inner my-1">
            {dataUrl ? (
              <img src={dataUrl} alt={`QR de ${user.firstName}`} className="w-52 h-52 rounded-lg" />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-surface-400 text-xs animate-pulse">
                Generando código QR...
              </div>
            )}
          </div>

          <p className="text-[11px] font-mono text-surface-400 dark:text-slate-500 mt-2 truncate max-w-[240px]">
            ID: {user.qrToken}
          </p>
        </div>

        <div className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-surface-50 dark:bg-[#1A2333] border border-surface-200 dark:border-white/10">
          <span className="text-xs font-mono text-surface-600 dark:text-slate-300 truncate mr-2">
            {user.qrToken}
          </span>
          <button
            onClick={handleCopyToken}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-surface-200 dark:border-transparent hover:bg-surface-100 dark:hover:bg-white/10 text-surface-700 dark:text-slate-200 transition-colors flex-shrink-0 cursor-pointer shadow-sm"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-primary-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? "Copiado" : "Copiar Token"}</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
