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
    department?: string | null;
    avatarUrl?: string | null;
  } | null;
  onRegenerateQr: (userId: string) => Promise<string | null>;
  onPrint?: (user: NonNullable<QrModalProps["user"]>) => void;
}

export function QrModal({ isOpen, onClose, user, onRegenerateQr, onPrint }: QrModalProps) {
  const { confirm } = useConfirm();
  const [dataUrl, setDataUrl] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Para credencial oficial física, descarga en imagen e impresión, se usa SIEMPRE el QR fijo (permanente).
  const payloadToEncode = user?.qrToken || "";

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
    if (onPrint && user) {
      onPrint(user);
      return;
    }

    const printContent = printRef.current;
    if (!printContent) return;

    const win = window.open("", "", "width=600,height=700");
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Credencial Oficial - ${user.firstName} ${user.lastName}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap" rel="stylesheet">
          <style>
            @page {
              size: auto;
              margin: 10mm;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body {
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #f8fafc;
              color: #0f172a;
            }
            .badge-wrapper {
              position: relative;
              background: #ffffff;
              width: 66mm;
              min-height: 100mm;
              border: 1px dashed #cbd5e1;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              text-align: center;
            }
            .header {
              padding: 10px 12px 6px;
              background: #f8fafc;
              border-bottom: 1px solid #f1f5f9;
            }
            .punch-hole {
              width: 30px;
              height: 7px;
              border-radius: 9999px;
              border: 1px solid #cbd5e1;
              background: #e2e8f0;
              margin: 0 auto 6px;
            }
            .org {
              font-size: 10px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #334155;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
            }
            .dot {
              width: 7px;
              height: 7px;
              background: #059669;
              border-radius: 9999px;
              display: inline-block;
            }
            .accent-bar {
              height: 4px;
              width: 100%;
              background: #059669;
            }
            .content {
              padding: 14px 12px 6px;
              display: flex;
              flex-direction: column;
              align-items: center;
              flex: 1;
            }
            .name {
              font-size: 15px;
              font-weight: 900;
              color: #0f172a;
              line-height: 1.2;
              margin-bottom: 4px;
            }
            .role-badge {
              display: inline-block;
              padding: 2px 8px;
              background: #ecfdf5;
              color: #065f46;
              border: 1px solid #a7f3d0;
              border-radius: 6px;
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 4px;
            }
            .doc {
              font-size: 9px;
              color: #64748b;
              font-weight: 600;
              margin-bottom: 10px;
            }
            .qr-box {
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 8px;
              margin: 0 auto 6px;
              box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
            }
            .qr-img {
              width: 120px;
              height: 120px;
              display: block;
            }
            .qr-label {
              font-size: 8px;
              font-weight: 800;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              margin-top: 4px;
            }
            .footer {
              padding: 6px 10px;
              background: #f8fafc;
              border-top: 1px solid #f1f5f9;
              font-size: 7.5px;
              color: #64748b;
              font-weight: 500;
            }
            @media print {
              body { background: transparent; }
              .badge-wrapper { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="badge-wrapper">
            <div class="header">
              <div class="punch-hole"></div>
              <div class="org"><span class="dot"></span> ${user.locationName || "Hotel Italia"} · PASE OFICIAL</div>
            </div>
            <div class="accent-bar"></div>
            <div class="content">
              <div class="name">${user.firstName} ${user.lastName}</div>
              <div class="role-badge">${user.role}</div>
              ${user.documentId ? `<div class="doc">DOC: ${user.documentId}</div>` : ""}
              <div class="qr-box">
                <img class="qr-img" src="${dataUrl}" alt="QR" />
                <div class="qr-label">Acceso Kiosco</div>
              </div>
            </div>
            <div class="footer">Credencial Oficial · Registro de Asistencia</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            }
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
      title="Credencial QR Oficial"
      description="Pase oficial permanente para marcaciones en kiosco (no expira)"
      icon={QrCode}
      iconVariant="primary"
      maxWidth="md"
      footer={footer}
    >
      <div className="flex flex-col items-center py-2 space-y-5">
        <div ref={printRef} className="w-full bg-white dark:bg-[#1A2333] rounded-2xl p-6 flex flex-col items-center shadow-sm border border-surface-200 dark:border-white/10">
          <div className="flex items-center gap-1.5 text-xs font-bold text-surface-900 dark:text-white tracking-wider uppercase mb-1">
            <Shield className="w-3.5 h-3.5 text-primary-500" />
            Presenxa · Pase Oficial Permanente
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
