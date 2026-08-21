"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { QrCode, Download, RefreshCw, X, Copy, Check, Printer, Shield, Sparkles } from "lucide-react";

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
    if (!confirm("¿Estás seguro de regenerar el código QR? El código anterior dejará de funcionar de inmediato.")) {
      return;
    }
    setIsRegenerating(true);
    try {
      await onRegenerateQr(user.id);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-surface-950/80 backdrop-blur-md overflow-hidden animate-fade-in-up">
      <div 
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl border border-primary-400/20 shadow-2xl shadow-black/90 my-auto overflow-hidden animate-scale-up"
        style={{ background: "rgba(10, 27, 44, 0.98)", backdropFilter: "blur(24px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-surface-950/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary-400/15 text-primary-300 ring-1 ring-primary-400/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Credencial QR Digital</h3>
              <p className="text-xs text-slate-400">Pase oficial para marcaciones en kiosco</p>
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
          {/* Badge Card preview */}
          <div ref={printRef} className="flex flex-col items-center">
            <div className="w-full bg-white rounded-2xl p-6 flex flex-col items-center shadow-xl text-slate-900 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 tracking-wider uppercase mb-1">
                <Shield className="w-3.5 h-3.5 text-primary-600" />
                Presenxa · Pase Oficial
              </div>
              <h4 className="text-xl font-black text-slate-900 text-center leading-tight">
                {user.firstName} {user.lastName}
              </h4>
              <p className="text-xs text-slate-500 font-medium capitalize mb-3">
                {user.role.toLowerCase()} {user.locationName ? `• ${user.locationName}` : ""}
              </p>

              {/* QR Image */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner my-1">
                {dataUrl ? (
                  <img src={dataUrl} alt={`QR de ${user.firstName}`} className="w-52 h-52 rounded-lg" />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs animate-pulse">
                    Generando código QR...
                  </div>
                )}
              </div>

              <p className="text-[11px] font-mono text-slate-400 mt-2 truncate max-w-[240px]">
                ID: {user.qrToken}
              </p>
            </div>
          </div>

          {/* Token copy block */}
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5 border border-white/8">
            <span className="text-xs font-mono text-slate-300 truncate mr-2">
              {user.qrToken}
            </span>
            <button
              onClick={handleCopyToken}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors flex-shrink-0 cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-primary-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? "Copiado" : "Copiar Token"}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-surface-950/50 grid grid-cols-3 gap-2 flex-shrink-0">
          <button
            onClick={handleDownload}
            disabled={!dataUrl}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-primary-400/15 border border-primary-400/30 hover:bg-primary-400/25 text-primary-300 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar
          </button>
          <button
            onClick={handlePrint}
            disabled={!dataUrl}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </button>
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
            Regenerar
          </button>
        </div>
      </div>
    </div>
  );
}
