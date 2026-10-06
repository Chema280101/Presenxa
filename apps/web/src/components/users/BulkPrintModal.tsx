"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import useSWR from "swr";
import QRCode from "qrcode";
import {
  Printer,
  X,
  FileText,
  CreditCard,
  Check,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Info,
  Building,
  Palette,
  Users,
  Calendar,
  Download,
  Layers,
  ChevronDown,
} from "lucide-react";
import {
  CredentialBadge,
  CredentialBadgeOptions,
  CredentialUser,
  BRAND_COLOR_PRESETS,
} from "./CredentialBadge";

export type SheetFormat = "a4" | "pvc";
export type BacksideLayout = "same-sheet" | "separate-sheets";

interface BulkPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: CredentialUser[];
  defaultOrgName?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function BulkPrintModal({
  isOpen,
  onClose,
  users,
  defaultOrgName = "Hotel Italia",
}: BulkPrintModalProps) {
  // Consultar datos oficiales de la organización (nombre, logoUrl)
  const { data: orgData } = useSWR(isOpen ? "/api/organization" : null, fetcher);

  const orgNameFromApi = orgData?.organization?.name || defaultOrgName;
  const orgLogoFromApi = orgData?.organization?.logoUrl || "/brand/logo.png";

  // Exclusión rápida de colaboradores dentro del modal
  const [excludedUserIds, setExcludedUserIds] = useState<string[]>([]);
  const [isUsersDropdownOpen, setIsUsersDropdownOpen] = useState(false);

  // Reiniciar exclusiones cuando se abra el modal o cambien los usuarios
  useEffect(() => {
    if (isOpen) {
      setExcludedUserIds([]);
    }
  }, [isOpen, users]);

  // Configuración de impresión con colores oficiales de Hotel Italia
  const [format, setFormat] = useState<SheetFormat>("a4");
  const [backsideLayout, setBacksideLayout] = useState<BacksideLayout>("same-sheet");
  const [previewFace, setPreviewFace] = useState<"all" | "front" | "back">("all");
  const [isDownloading, setIsDownloading] = useState(false);
  const [mobileTab, setMobileTab] = useState<"settings" | "preview">("preview");

  const [options, setOptions] = useState<CredentialBadgeOptions>({
    orientation: "vertical",
    showAvatar: true,
    showLogo: true,
    showDocumentId: true,
    showLocation: true,
    showRole: true,
    showToken: false,
    showCropMarks: true,
    accentColor: "#00A650", // Verde Hotel Italia oficial
    organizationName: orgNameFromApi,
    logoUrl: orgLogoFromApi,
    // Nuevas opciones avanzadas
    includeBackside: false,
    showValidity: false,
    validityText: "2026 - 2027",
    backsidePolicyText:
      "Esta credencial es propiedad de la empresa. Su uso es personal e intransferible. Debe portarse en lugar visible.",
    backsideContactText:
      "En caso de extravío, devolver en Recepción o comunicarse con el dpto. de Recursos Humanos.",
  });

  // Actualizar logo o nombre si se cargan de la API
  useEffect(() => {
    if (orgData?.organization) {
      setOptions((prev) => ({
        ...prev,
        organizationName: prev.organizationName || orgData.organization.name,
        logoUrl: orgData.organization.logoUrl || prev.logoUrl || "/brand/logo.png",
      }));
    }
  }, [orgData]);

  // Colaboradores activos (filtrando los excluidos)
  const activeUsers = useMemo(() => {
    return users.filter((u) => !excludedUserIds.includes(u.id));
  }, [users, excludedUserIds]);

  // Estado de zoom y QRs generados
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [isGeneratingQrs, setIsGeneratingQrs] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bloquear scroll de la página detrás del modal
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Generar todos los QRs de alta resolución al abrir el modal o cambiar la lista
  useEffect(() => {
    if (!isOpen || activeUsers.length === 0) return;

    let isCancelled = false;
    async function generateAll() {
      setIsGeneratingQrs(true);
      const generated: Record<string, string> = {};

      for (const u of activeUsers) {
        if (isCancelled) break;
        // Para impresión física (PVC o papel), SIEMPRE se debe usar el QR Fijo (qrToken UUID).
        // Los QR firmados dinámicamente contienen timestamp y caducan a los 90s, no son para imprimir.
        const payload = u.qrToken;
        if (!payload) continue;

        try {
          const url = await QRCode.toDataURL(payload, {
            width: 380,
            margin: 1,
            color: {
              dark: "#060E17",
              light: "#FFFFFF",
            },
            errorCorrectionLevel: "H",
          });
          generated[u.id] = url;
        } catch (err) {
          console.error("Error generating QR for badge", u.id, err);
        }
      }

      if (!isCancelled) {
        setQrDataUrls(generated);
        setIsGeneratingQrs(false);
      }
    }

    generateAll();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, activeUsers]);

  const isSameSheet =
    format === "a4" && Boolean(options.includeBackside) && backsideLayout === "same-sheet";

  // Capacidad de hoja A4:
  // - PVC: 1 por tarjeta
  // - A4 con Frente y Reverso en la misma hoja (cada colaborador usa 2 espacios: frente y reverso):
  //   Vertical: 2 colaboradores por hoja (4 gafetes totales en 2 columnas x 2 filas).
  //   Horizontal: 2 colaboradores por hoja (4 tarjetas en 2 columnas x 2 filas).
  // - A4 estándar (solo frente o hojas separadas):
  //   Vertical: 4 colaboradores por hoja.
  //   Horizontal: 6 colaboradores por hoja.
  const itemsPerPage =
    format === "pvc"
      ? 1
      : isSameSheet
      ? 2
      : options.orientation === "vertical"
      ? 4
      : 6;

  const pages = useMemo(() => {
    if (format === "pvc") {
      return activeUsers.map((u) => [u]);
    }
    const chunks: CredentialUser[][] = [];
    for (let i = 0; i < activeUsers.length; i += itemsPerPage) {
      chunks.push(activeUsers.slice(i, i + itemsPerPage));
    }
    return chunks;
  }, [activeUsers, format, itemsPerPage]);

  const totalPrintSheets = useMemo(() => {
    if (format === "pvc") {
      return activeUsers.length * (options.includeBackside ? 2 : 1);
    }
    if (!options.includeBackside || isSameSheet) {
      return pages.length;
    }
    return pages.length * 2;
  }, [format, activeUsers.length, options.includeBackside, isSameSheet, pages.length]);

  // Lista de hojas a previsualizar en el lienzo según formato y modo de cara
  const previewSheets = useMemo(() => {
    const sheets: Array<{
      key: string;
      pageUsers: CredentialUser[];
      mode: "same-sheet" | "single-side";
      isBackside: boolean;
      sheetNumber: number;
      totalSheets: number;
      badgeText: string;
    }> = [];

    const hasBackside = Boolean(options.includeBackside);

    pages.forEach((pageUsers, pageIndex) => {
      if (!hasBackside) {
        // Solo Frente
        sheets.push({
          key: `preview-front-${pageIndex}`,
          pageUsers,
          mode: "single-side",
          isBackside: false,
          sheetNumber: pageIndex + 1,
          totalSheets: pages.length,
          badgeText: `Frente de Hoja (${format === "a4" ? "A4" : "PVC"})`,
        });
      } else if (isSameSheet) {
        // Frente y Reverso en la misma hoja A4
        sheets.push({
          key: `preview-samesheet-${pageIndex}`,
          pageUsers,
          mode: "same-sheet",
          isBackside: false,
          sheetNumber: pageIndex + 1,
          totalSheets: pages.length,
          badgeText: `Frente y Reverso en la misma hoja (A4)`,
        });
      } else {
        // Hojas separadas (Dúplex o PVC)
        if (previewFace === "all") {
          sheets.push({
            key: `preview-front-${pageIndex}`,
            pageUsers,
            mode: "single-side",
            isBackside: false,
            sheetNumber: pageIndex * 2 + 1,
            totalSheets: pages.length * 2,
            badgeText: `Frente de Hoja (${format === "a4" ? "A4" : "PVC"})`,
          });
          sheets.push({
            key: `preview-back-${pageIndex}`,
            pageUsers,
            mode: "single-side",
            isBackside: true,
            sheetNumber: pageIndex * 2 + 2,
            totalSheets: pages.length * 2,
            badgeText: `Reverso de Hoja (${format === "a4" ? "A4" : "PVC"})`,
          });
        } else if (previewFace === "front") {
          sheets.push({
            key: `preview-front-${pageIndex}`,
            pageUsers,
            mode: "single-side",
            isBackside: false,
            sheetNumber: pageIndex + 1,
            totalSheets: pages.length,
            badgeText: `Frente de Hoja (${format === "a4" ? "A4" : "PVC"})`,
          });
        } else if (previewFace === "back") {
          sheets.push({
            key: `preview-back-${pageIndex}`,
            pageUsers,
            mode: "single-side",
            isBackside: true,
            sheetNumber: pageIndex + 1,
            totalSheets: pages.length,
            badgeText: `Reverso de Hoja (${format === "a4" ? "A4" : "PVC"})`,
          });
        }
      }
    });

    return sheets;
  }, [pages, options.includeBackside, isSameSheet, previewFace, format]);

  if (!isOpen || !mounted) return null;

  const handlePrint = () => {
    window.print();
  };

  const updateOption = <K extends keyof CredentialBadgeOptions>(
    key: K,
    value: CredentialBadgeOptions[K]
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const toggleExcludeUser = (userId: string) => {
    setExcludedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Descarga digital rápida en PNG de la credencial
  const handleDownloadPng = async () => {
    if (activeUsers.length === 0) return;
    setIsDownloading(true);

    try {
      // Descargar cada usuario activo con retardo para permitir descargas múltiples
      for (const user of activeUsers) {
        const qrUrl = qrDataUrls[user.id];
        if (!qrUrl) continue;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        // Canvas de alta resolución (300 DPI aprox: 600x900px)
        const isVert = options.orientation === "vertical";
        canvas.width = isVert ? 600 : 900;
        canvas.height = isVert ? 900 : 560;

        // Fondo blanco redondeado
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Barra superior de marca
        ctx.fillStyle = options.accentColor || "#00A650";
        ctx.fillRect(0, 0, canvas.width, 16);

        // Borde exterior
        ctx.strokeStyle = "#E2E8F0";
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

        // Texto cabecera
        ctx.fillStyle = "#1E293B";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(options.organizationName || "Hotel Italia", canvas.width / 2, 60);

        // Subtítulo
        ctx.fillStyle = "#64748B";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("PASE OFICIAL DE ASISTENCIA", canvas.width / 2, 90);

        // Nombre del Colaborador
        ctx.fillStyle = "#0F172A";
        ctx.font = "bold 32px sans-serif";
        ctx.fillText(`${user.firstName} ${user.lastName}`, canvas.width / 2, isVert ? 160 : 150);

        // Rol / Cargo
        ctx.fillStyle = options.accentColor || "#00A650";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(user.role.toUpperCase(), canvas.width / 2, isVert ? 200 : 190);

        // Documento y sede
        ctx.fillStyle = "#64748B";
        ctx.font = "18px sans-serif";
        const metaText = [
          user.documentId ? `DOC: ${user.documentId}` : null,
          user.locationName ? user.locationName : null,
          options.showValidity && options.validityText ? `Válido: ${options.validityText}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        ctx.fillText(metaText, canvas.width / 2, isVert ? 235 : 225);

        // Dibujar Código QR en el canvas
        const qrImage = new Image();
        await new Promise((resolve) => {
          qrImage.onload = () => {
            const qrSize = isVert ? 360 : 250;
            const qrX = isVert ? (canvas.width - qrSize) / 2 : canvas.width - qrSize - 50;
            const qrY = isVert ? 290 : 200;
            ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
            resolve(true);
          };
          qrImage.src = qrUrl;
        });

        // Token al pie
        ctx.fillStyle = "#94A3B8";
        ctx.font = "14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`ID: ${user.qrToken}`, canvas.width / 2, canvas.height - 40);

        // Aviso final
        ctx.fillStyle = "#64748B";
        ctx.font = "13px sans-serif";
        ctx.fillText("Pase oficial intransferible · Presenxa", canvas.width / 2, canvas.height - 18);

        // Disparar descarga del archivo PNG del Frente
        const link = document.createElement("a");
        link.download = `Credencial_${user.firstName}_${user.lastName}_Frente.png`;
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Si tiene reverso habilitado, generar y descargar también el archivo PNG del Reverso
        if (options.includeBackside) {
          const backCanvas = document.createElement("canvas");
          const backCtx = backCanvas.getContext("2d");
          if (backCtx) {
            backCanvas.width = canvas.width;
            backCanvas.height = canvas.height;

            // Fondo blanco
            backCtx.fillStyle = "#FFFFFF";
            backCtx.fillRect(0, 0, backCanvas.width, backCanvas.height);

            // Barra superior
            backCtx.fillStyle = options.accentColor || "#00A650";
            backCtx.fillRect(0, 0, backCanvas.width, 16);

            // Borde exterior
            backCtx.strokeStyle = "#E2E8F0";
            backCtx.lineWidth = 4;
            backCtx.strokeRect(2, 2, backCanvas.width - 4, backCanvas.height - 4);

            // Cabecera Reverso
            backCtx.fillStyle = "#1E293B";
            backCtx.font = "bold 24px sans-serif";
            backCtx.textAlign = "center";
            backCtx.fillText(`${options.organizationName || "Hotel Italia"} · REVERSO`, backCanvas.width / 2, 60);

            // Título Políticas
            backCtx.fillStyle = "#0F172A";
            backCtx.font = "bold 20px sans-serif";
            backCtx.fillText("POLÍTICAS DE USO", backCanvas.width / 2, isVert ? 140 : 120);

            // Texto de Políticas
            backCtx.fillStyle = "#475569";
            backCtx.font = "16px sans-serif";
            const policy =
              options.backsidePolicyText ||
              "Esta credencial es propiedad de la empresa. Su uso es personal e intransferible. Debe portarse en lugar visible.";
            const words = policy.split(" ");
            let line = "";
            let y = isVert ? 180 : 160;
            for (const w of words) {
              const testLine = line + w + " ";
              if (backCtx.measureText(testLine).width > backCanvas.width - 80) {
                backCtx.fillText(line, backCanvas.width / 2, y);
                line = w + " ";
                y += 24;
              } else {
                line = testLine;
              }
            }
            backCtx.fillText(line, backCanvas.width / 2, y);

            // Contacto
            y += 40;
            backCtx.fillStyle = "#0F172A";
            backCtx.font = "bold 18px sans-serif";
            backCtx.fillText("EN CASO DE EXTRAVÍO:", backCanvas.width / 2, y);
            y += 26;
            backCtx.fillStyle = "#475569";
            backCtx.font = "15px sans-serif";
            const contact =
              options.backsideContactText ||
              "En caso de extravío, devolver en Recepción o comunicarse con RRHH.";
            backCtx.fillText(contact, backCanvas.width / 2, y);

            if (options.showValidity && options.validityText) {
              y += 40;
              backCtx.fillStyle = options.accentColor || "#00A650";
              backCtx.font = "bold 16px sans-serif";
              backCtx.fillText(`VIGENCIA: ${options.validityText}`, backCanvas.width / 2, y);
            }

            // Pie
            backCtx.fillStyle = "#94A3B8";
            backCtx.font = "13px sans-serif";
            backCtx.fillText(
              `TITULAR: ${user.firstName.toUpperCase()} ${user.lastName.toUpperCase()} · Presenxa`,
              backCanvas.width / 2,
              backCanvas.height - 20
            );

            await new Promise((r) => setTimeout(r, 150));
            const backLink = document.createElement("a");
            backLink.download = `Credencial_${user.firstName}_${user.lastName}_Reverso.png`;
            backLink.href = backCanvas.toDataURL("image/png");
            document.body.appendChild(backLink);
            backLink.click();
            document.body.removeChild(backLink);
          }
        }

        // Pequeña pausa para evitar bloqueo del navegador en descargas múltiples
        await new Promise((r) => setTimeout(r, 200));
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Contenido impreso físico (@media print)
  const printPortalContent = (
    <div id="credential-print-portal" className="hidden print:block">
      {pages.map((pageUsers, pageIndex) => (
        <React.Fragment key={`print-page-group-${pageIndex}`}>
          {isSameSheet ? (
            /* HOJA CON FRENTE Y REVERSO JUNTOS EN LA MISMA HOJA A4 */
            <div
              className="print-page-break bg-white"
              style={{
                width: "210mm",
                height: "297mm",
                padding: "10mm",
                margin: "0 auto",
                boxSizing: "border-box",
              }}
            >
              <div className="grid grid-cols-2 gap-x-[10mm] gap-y-[10mm] items-start justify-items-center">
                {pageUsers.map((user) => (
                  <React.Fragment key={`badge-print-pair-${user.id}`}>
                    <div className="print-avoid-break flex justify-center">
                      <CredentialBadge
                        user={user}
                        qrDataUrl={qrDataUrls[user.id]}
                        options={options}
                        isPrintMode={true}
                        isBackside={false}
                      />
                    </div>
                    <div className="print-avoid-break flex justify-center">
                      <CredentialBadge
                        user={user}
                        qrDataUrl={qrDataUrls[user.id]}
                        options={options}
                        isPrintMode={true}
                        isBackside={true}
                      />
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* HOJA DE FRENTES */}
              <div
                className="print-page-break bg-white"
                style={{
                  width: format === "a4" ? "210mm" : "85.6mm",
                  height: format === "a4" ? "297mm" : "54mm",
                  padding: format === "a4" ? "10mm" : "0mm",
                  margin: "0 auto",
                  boxSizing: "border-box",
                }}
              >
                {format === "a4" ? (
                  <div className="grid grid-cols-2 gap-x-[10mm] gap-y-[10mm] items-start justify-items-center">
                    {pageUsers.map((user) => (
                      <div key={`badge-print-front-${user.id}`} className="print-avoid-break flex justify-center">
                        <CredentialBadge
                          user={user}
                          qrDataUrl={qrDataUrls[user.id]}
                          options={options}
                          isPrintMode={true}
                          isBackside={false}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  // PVC: 1 por página
                  <div className="w-full h-full flex items-center justify-center">
                    {pageUsers[0] && (
                      <CredentialBadge
                        user={pageUsers[0]}
                        qrDataUrl={qrDataUrls[pageUsers[0].id]}
                        options={{ ...options, showCropMarks: false }}
                        isPrintMode={true}
                        isBackside={false}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* HOJA DE REVERSOS (Solo si includeBackside está activo y son hojas separadas) */}
              {options.includeBackside && (
                <div
                  className="print-page-break bg-white"
                  style={{
                    width: format === "a4" ? "210mm" : "85.6mm",
                    height: format === "a4" ? "297mm" : "54mm",
                    padding: format === "a4" ? "10mm" : "0mm",
                    margin: "0 auto",
                    boxSizing: "border-box",
                  }}
                >
                  {format === "a4" ? (
                    <div className="grid grid-cols-2 gap-x-[10mm] gap-y-[10mm] items-start justify-items-center">
                      {pageUsers.map((user) => (
                        <div key={`badge-print-back-${user.id}`} className="print-avoid-break flex justify-center">
                          <CredentialBadge
                            user={user}
                            qrDataUrl={qrDataUrls[user.id]}
                            options={options}
                            isPrintMode={true}
                            isBackside={true}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {pageUsers[0] && (
                        <CredentialBadge
                          user={pageUsers[0]}
                          qrDataUrl={qrDataUrls[pageUsers[0].id]}
                          options={{ ...options, showCropMarks: false }}
                          isPrintMode={true}
                          isBackside={true}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </React.Fragment>
      ))}
      <style jsx global>{`
        @media print {
          @page {
            size: ${format === "a4" ? "A4 portrait" : (options.orientation === "horizontal" ? "85.6mm 54mm landscape" : "54mm 85.6mm portrait")};
            margin: 0;
          }
        }
      `}</style>
    </div>
  );

  // Modal completo montado mediante createPortal en document.body para abarcar toda la pantalla
  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-fade-in print:hidden"
    >
      {/* Backdrop con clic para cerrar */}
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Ventana Principal del Modal */}
      <div className="relative w-full max-w-6xl h-[92dvh] sm:h-[88vh] max-h-[860px] bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        {/* Cabecera del Estudio */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-surface-200 dark:border-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-surface-950 shrink-0 z-20">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl border flex items-center justify-center shadow-inner shrink-0 transition-colors"
              style={{
                backgroundColor: `${options.accentColor}18`,
                borderColor: `${options.accentColor}35`,
                color: options.accentColor,
              }}
            >
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-surface-900 dark:text-white leading-tight">
                  {users.length === 1 ? "Impresión de Credencial" : "Estudio de Impresión de Credenciales"}
                </h2>

                {/* Dropdown de exclusión rápida de colaboradores si son múltiples, o badge de colaborador si es 1 */}
                {users.length > 1 ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsUsersDropdownOpen(!isUsersDropdownOpen)}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all hover:scale-105"
                      style={{
                        backgroundColor: `${options.accentColor}15`,
                        borderColor: `${options.accentColor}30`,
                        color: options.accentColor === "#1F1F1F" ? "#334155" : options.accentColor,
                      }}
                    >
                      <Users className="w-3 h-3" />
                      <span>
                        {activeUsers.length} de {users.length} incluidos
                      </span>
                      <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                    </button>

                    {/* Popover con lista de checkboxes */}
                    {isUsersDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-[#0f172a] rounded-xl shadow-xl border border-surface-200 dark:border-white/10 p-2 z-50 animate-scale-up text-xs">
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-surface-100 dark:border-white/10 text-[10px] font-bold text-surface-500 uppercase">
                          <span>Incluir en esta impresión</span>
                          <button
                            type="button"
                            onClick={() => setExcludedUserIds([])}
                            className="text-primary-600 hover:underline cursor-pointer"
                          >
                            Marcar todos
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {users.map((u) => {
                            const isIncluded = !excludedUserIds.includes(u.id);
                            return (
                              <label
                                key={`exclude-${u.id}`}
                                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-50 dark:hover:bg-white/5 cursor-pointer text-[11px]"
                              >
                                <span className="truncate mr-2 font-medium text-surface-800 dark:text-slate-200">
                                  {u.firstName} {u.lastName}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={isIncluded}
                                  onChange={() => toggleExcludeUser(u.id)}
                                  className="w-3.5 h-3.5 rounded text-primary-500 accent-emerald-500 cursor-pointer shrink-0"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border shrink-0"
                    style={{
                      backgroundColor: `${options.accentColor}15`,
                      borderColor: `${options.accentColor}30`,
                      color: options.accentColor === "#1F1F1F" ? "#334155" : options.accentColor,
                    }}
                  >
                    <Users className="w-3 h-3" />
                    <span>{users[0]?.firstName} {users[0]?.lastName}</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-surface-500 dark:text-slate-400">
                {users.length === 1
                  ? "Credencial oficial con QR fijo permanente (no caduca) lista para plastificar o imprimir en PVC"
                  : "Pases oficiales con QR fijo permanente (no caducan) listos para plastificar o imprimir en PVC"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            {/* Botón de descarga digital PNG */}
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isDownloading || isGeneratingQrs}
              title="Descargar imágenes PNG en alta resolución para celular o WhatsApp"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 dark:border-white/10 bg-surface-100 hover:bg-surface-200 dark:bg-white/5 dark:hover:bg-white/10 text-surface-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-primary-500" />
              <span>{isDownloading ? "Descargando..." : "Descargar PNG"}</span>
            </button>

            {/* Botón de impresión física */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGeneratingQrs}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{
                backgroundColor: options.accentColor || "#00A650",
                boxShadow: `0 4px 14px 0 ${options.accentColor}40`,
              }}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                <span className="hidden xs:inline">Imprimir </span>({totalPrintSheets} {totalPrintSheets === 1 ? "hoja" : "hojas"})
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-surface-400 hover:text-surface-700 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-white/10 transition cursor-pointer"
              aria-label="Cerrar estudio de impresión"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher (< lg screens) */}
        <div className="lg:hidden flex items-center justify-center p-2 bg-white dark:bg-surface-950 border-b border-surface-200 dark:border-surface-800 shrink-0">
          <div className="flex rounded-xl bg-surface-100 dark:bg-surface-850 p-0.5 w-full max-w-xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMobileTab("settings")}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileTab === "settings"
                  ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-xs font-bold"
                  : "text-surface-500 hover:text-surface-900 dark:hover:text-white"
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-primary-500" />
              <span>Ajustes</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileTab === "preview"
                  ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-xs font-bold"
                  : "text-surface-500 hover:text-surface-900 dark:hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-primary-500" />
              <span>Vista Previa</span>
            </button>
          </div>
        </div>

        {/* Cuerpo principal: Panel de Configuración (Izq) + Vista Previa (Der) */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Panel Lateral Compacto */}
          <div className={`w-full lg:w-72 p-4 bg-white dark:bg-surface-900/90 border-r border-surface-200 dark:border-surface-800 overflow-y-auto min-h-0 space-y-3.5 shrink-0 text-xs ${mobileTab === 'settings' ? 'block' : 'hidden lg:block'}`}>
            {/* Formato de Hoja */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-primary-500" />
                Formato de Salida
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setFormat("a4");
                    updateOption("showCropMarks", true);
                  }}
                  className={`p-1.5 px-2 rounded-lg border text-left transition cursor-pointer ${
                    format === "a4"
                      ? "border-primary-500 bg-primary-50/50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30"
                      : "border-surface-200 dark:border-white/10 hover:bg-surface-50 dark:hover:bg-white/5 text-surface-700 dark:text-slate-300"
                  }`}
                >
                  <div className="font-bold text-[11px]">Hoja A4</div>
                  <div className="text-[9px] opacity-75">
                    {users.length === 1
                      ? "1 en hoja A4"
                      : options.orientation === "vertical"
                      ? "4 por hoja"
                      : "6 por hoja"}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormat("pvc");
                    updateOption("showCropMarks", false);
                  }}
                  className={`p-1.5 px-2 rounded-lg border text-left transition cursor-pointer ${
                    format === "pvc"
                      ? "border-primary-500 bg-primary-50/50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30"
                      : "border-surface-200 dark:border-white/10 hover:bg-surface-50 dark:hover:bg-white/5 text-surface-700 dark:text-slate-300"
                  }`}
                >
                  <div className="font-bold text-[11px]">Tarjeta PVC</div>
                  <div className="text-[9px] opacity-75">1 por página</div>
                </button>
              </div>
            </div>

            {/* Orientación */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-primary-500" />
                Orientación
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => updateOption("orientation", "vertical")}
                  className={`py-1 px-2 rounded-lg border text-center text-[11px] font-semibold transition cursor-pointer ${
                    options.orientation === "vertical"
                      ? "border-primary-500 bg-primary-50/50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30"
                      : "border-surface-200 dark:border-white/10 text-surface-600 dark:text-slate-300 hover:bg-surface-50 dark:hover:bg-white/5"
                  }`}
                >
                  Vertical (Gafete)
                </button>
                <button
                  type="button"
                  onClick={() => updateOption("orientation", "horizontal")}
                  className={`py-1 px-2 rounded-lg border text-center text-[11px] font-semibold transition cursor-pointer ${
                    options.orientation === "horizontal"
                      ? "border-primary-500 bg-primary-50/50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30"
                      : "border-surface-200 dark:border-white/10 text-surface-600 dark:text-slate-300 hover:bg-surface-50 dark:hover:bg-white/5"
                  }`}
                >
                  Horizontal (Card)
                </button>
              </div>
            </div>

            {/* Nombre de la Organización / Cabecera */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Building className="w-3 h-3 text-primary-500" />
                Cabecera / Empresa
              </label>
              <input
                type="text"
                value={options.organizationName || ""}
                onChange={(e) => updateOption("organizationName", e.target.value)}
                placeholder="Ej: HOTEL ITALIA"
                className="w-full px-2.5 py-1 text-xs rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/10 text-surface-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Color de Marca Corporativo (Paleta oficial Hotel Italia + Custom Picker) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-400 flex items-center gap-1">
                  <Palette className="w-3 h-3 text-primary-500" />
                  Color de Marca
                </label>
                <span className="font-mono text-[10px] font-semibold text-surface-500 dark:text-slate-400">
                  {options.accentColor.toUpperCase()}
                </span>
              </div>

              {/* Botones de colores oficiales Hotel Italia */}
              <div className="flex items-center gap-2 mb-1">
                {BRAND_COLOR_PRESETS.map((p) => {
                  const isSelected = options.accentColor.toLowerCase() === p.hex.toLowerCase();
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => updateOption("accentColor", p.hex)}
                      title={p.label}
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-surface-900 scale-110"
                          : "opacity-80 hover:opacity-100 hover:scale-105"
                      }`}
                      style={{ backgroundColor: p.hex }}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white drop-shadow-sm" />}
                    </button>
                  );
                })}

                {/* Selector de color personalizado (Color Picker nativo) */}
                <label
                  title="Color personalizado (Selector HEX)"
                  className="w-5 h-5 rounded-full border border-dashed border-surface-400 dark:border-surface-600 flex items-center justify-center cursor-pointer hover:border-primary-500 relative overflow-hidden shrink-0"
                >
                  <input
                    type="color"
                    value={options.accentColor}
                    onChange={(e) => updateOption("accentColor", e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: options.accentColor }}
                  />
                </label>
              </div>

              <div className="text-[9.5px] text-surface-500 dark:text-slate-400 font-medium truncate">
                {BRAND_COLOR_PRESETS.find((p) => p.hex.toLowerCase() === options.accentColor.toLowerCase())?.label || "Color Personalizado"}
              </div>
            </div>

            {/* Configuración de Vigencia */}
            <div>
              <label className="flex items-center justify-between p-1 px-2 rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/5 hover:bg-surface-100 dark:hover:bg-white/10 transition cursor-pointer select-none mb-1">
                <span className="text-[10.5px] font-semibold text-surface-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-primary-500" />
                  Mostrar Vigencia / Fecha
                </span>
                <input
                  type="checkbox"
                  checked={options.showValidity || false}
                  onChange={(e) => updateOption("showValidity", e.target.checked)}
                  className="w-3 h-3 rounded text-primary-500 focus:ring-primary-500 accent-emerald-500 cursor-pointer"
                />
              </label>

              {options.showValidity && (
                <input
                  type="text"
                  value={options.validityText || ""}
                  onChange={(e) => updateOption("validityText", e.target.value)}
                  placeholder="Ej: 2026 - 2027 o Válido 1 año"
                  className="w-full px-2 py-1 text-[11px] rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/10 text-surface-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              )}
            </div>

            {/* Configuración de Reverso (Doble Cara) con Toggle */}
            <div className="pt-1 border-t border-surface-100 dark:border-white/10">
              <label className="flex items-center justify-between p-1 px-2 rounded-lg bg-primary-50/50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 hover:bg-primary-100/50 dark:hover:bg-primary-500/15 transition cursor-pointer select-none mb-1">
                <span className="text-[10.5px] font-bold text-primary-800 dark:text-primary-300 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-primary-500" />
                  Incluir Reverso (Doble Cara)
                </span>
                <input
                  type="checkbox"
                  checked={options.includeBackside || false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updateOption("includeBackside", checked);
                    setPreviewFace(checked ? "all" : "front");
                  }}
                  className="w-3.5 h-3.5 rounded text-primary-500 focus:ring-primary-500 accent-emerald-500 cursor-pointer"
                />
              </label>

              {options.includeBackside && (
                <div className="space-y-1.5 mt-1.5 p-2 rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/10 animate-fade-in">
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                      Texto de Políticas
                    </label>
                    <textarea
                      rows={2}
                      value={options.backsidePolicyText || ""}
                      onChange={(e) => updateOption("backsidePolicyText", e.target.value)}
                      placeholder="Políticas de uso..."
                      className="w-full px-2 py-1 text-[10px] rounded bg-white dark:bg-black/20 border border-surface-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                      En caso de extravío
                    </label>
                    <input
                      type="text"
                      value={options.backsideContactText || ""}
                      onChange={(e) => updateOption("backsideContactText", e.target.value)}
                      placeholder="Devolver en recepción..."
                      className="w-full px-2 py-1 text-[10px] rounded bg-white dark:bg-black/20 border border-surface-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  {format === "a4" && (
                    <div className="pt-2 border-t border-surface-200/60 dark:border-white/10">
                      <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">
                        Disposición en hoja A4
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setBacksideLayout("same-sheet")}
                          className={`p-1.5 px-2 rounded-lg border text-left transition cursor-pointer ${
                            backsideLayout === "same-sheet"
                              ? "border-primary-500 bg-primary-50/60 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30"
                              : "border-surface-200 dark:border-white/10 hover:bg-surface-100 dark:hover:bg-white/5 text-surface-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="font-bold text-[10px] leading-tight">Misma Hoja A4</div>
                          <div className="text-[8px] opacity-75 mt-0.5">Frente y reverso juntos (1 hoja)</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBacksideLayout("separate-sheets")}
                          className={`p-1.5 px-2 rounded-lg border text-left transition cursor-pointer ${
                            backsideLayout === "separate-sheets"
                              ? "border-primary-500 bg-primary-50/60 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30"
                              : "border-surface-200 dark:border-white/10 hover:bg-surface-100 dark:hover:bg-white/5 text-surface-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="font-bold text-[10px] leading-tight">Hojas Separadas</div>
                          <div className="text-[8px] opacity-75 mt-0.5">Dúplex (2 hojas)</div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Toggles de Contenido Visible en 2 Columnas Compactas */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-400 mb-1 block">
                Datos Visibles
              </label>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {[
                  { key: "showLogo", label: "Logo Hotel" },
                  { key: "showAvatar", label: "Avatar" },
                  { key: "showRole", label: "Cargo / Rol" },
                  { key: "showDocumentId", label: "DNI / Doc" },
                  { key: "showLocation", label: "Sede" },
                  { key: "showToken", label: "Token ID" },
                  { key: "showCropMarks", label: "Guías corte" },
                ].map(({ key, label }) => {
                  const typedKey = key as keyof CredentialBadgeOptions;
                  const isChecked = Boolean(options[typedKey]);
                  return (
                    <label
                      key={key}
                      className="flex items-center justify-between p-1 px-2 rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/5 hover:bg-surface-100 dark:hover:bg-white/10 transition cursor-pointer select-none"
                    >
                      <span className="text-surface-700 dark:text-slate-300 font-medium truncate mr-1">
                        {label}
                      </span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => updateOption(typedKey, e.target.checked as any)}
                        className="w-3 h-3 rounded text-primary-500 focus:ring-primary-500 accent-emerald-500 cursor-pointer shrink-0"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Tip de impresión compacto */}
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-[9.5px] leading-snug flex items-start gap-1.5">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              <span>
                <strong>Tip:</strong> Activa <em>&ldquo;Gráficos en segundo plano&rdquo;</em> para colores exactos.
              </span>
            </div>
          </div>

          {/* Área de Previsualización Interactiva (Der) */}
          <div className={`flex-1 flex flex-col min-w-0 bg-slate-200/90 dark:bg-[#070c14] overflow-hidden ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
            {/* Barra superior de Zoom, Pestañas Frente/Reverso y Estado */}
            <div className="px-4 py-2 bg-slate-100 dark:bg-[#0e1726] border-b border-slate-300 dark:border-white/10 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                {/* Selector Frente / Reverso (solo si includeBackside está activo) */}
                {options.includeBackside ? (
                  isSameSheet ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                      <Layers className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Frente y Reverso juntos en la misma hoja ({previewSheets.length} {previewSheets.length === 1 ? "hoja" : "hojas"})</span>
                    </div>
                  ) : (
                    <div className="flex items-center p-0.5 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setPreviewFace("all")}
                        className={`px-2.5 py-0.5 rounded transition cursor-pointer ${
                          previewFace === "all"
                            ? "bg-primary-500 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        Ambas Caras
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFace("front")}
                        className={`px-2.5 py-0.5 rounded transition cursor-pointer ${
                          previewFace === "front"
                            ? "bg-primary-500 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        Solo Frente
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFace("back")}
                        className={`px-2.5 py-0.5 rounded transition cursor-pointer ${
                          previewFace === "back"
                            ? "bg-primary-500 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        Solo Reverso
                      </button>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-1.5 text-surface-600 dark:text-slate-400 text-[11px]">
                    <Eye className="w-3.5 h-3.5" />
                    <span>
                      {pages.length} {pages.length === 1 ? "hoja" : "hojas"} ({activeUsers.length}{" "}
                      {activeUsers.length === 1 ? "credencial" : "credenciales"})
                    </span>
                  </div>
                )}

                {isGeneratingQrs && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary-500 animate-pulse font-semibold ml-1">
                    <Sparkles className="w-3 h-3" /> Generando QRs...
                  </span>
                )}
              </div>

              {/* Controles de Zoom */}
              <div className="flex items-center gap-1 bg-white dark:bg-white/5 rounded-lg border border-slate-300 dark:border-white/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.7, Math.round((z - 0.1) * 10) / 10))}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
                  title="Reducir zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono px-1.5 text-slate-700 dark:text-slate-200">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(1.2, Math.round((z + 0.1) * 10) / 10))}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1.0)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer ml-0.5"
                  title="Restablecer zoom"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Lienzo con scroll donde se dibuja la hoja simulada */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center gap-6 min-h-0">
              {previewSheets.map((sheet) => (
                <div key={sheet.key} className="flex flex-col items-center shrink-0">
                  {/* Título de la hoja con pill identificador de Frente / Reverso */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Página {sheet.sheetNumber} de {sheet.totalSheets}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        sheet.mode === "same-sheet"
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                          : sheet.isBackside
                          ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300"
                          : "bg-primary-500/15 border-primary-500/30 text-primary-700 dark:text-primary-300"
                      }`}
                    >
                      {sheet.badgeText}
                    </span>
                  </div>

                  {/* Hoja blanca simulada con proporciones perfectas */}
                  <div
                    style={{
                      width:
                        format === "a4"
                          ? options.orientation === "horizontal"
                            ? `${Math.round(620 * zoomLevel)}px`
                            : `${Math.round(480 * zoomLevel)}px`
                          : `${Math.round(330 * zoomLevel)}px`,
                    }}
                    className="bg-white text-slate-900 shadow-xl rounded-xl p-4 sm:p-5 box-border border border-slate-300/80 transition-all duration-150"
                  >
                    {format === "a4" ? (
                      sheet.mode === "same-sheet" ? (
                        <div className="grid grid-cols-2 gap-3.5 sm:gap-4 items-start justify-items-center w-full">
                          {sheet.pageUsers.map((user) => (
                            <React.Fragment key={`preview-pair-${user.id}`}>
                              <div className="flex flex-col items-center gap-1 w-full min-w-0">
                                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  Frente
                                </span>
                                <CredentialBadge
                                  user={user}
                                  qrDataUrl={qrDataUrls[user.id]}
                                  options={options}
                                  scale={zoomLevel !== 1 ? zoomLevel : undefined}
                                  isBackside={false}
                                />
                              </div>
                              <div className="flex flex-col items-center gap-1 w-full min-w-0">
                                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  Reverso
                                </span>
                                <CredentialBadge
                                  user={user}
                                  qrDataUrl={qrDataUrls[user.id]}
                                  options={options}
                                  scale={zoomLevel !== 1 ? zoomLevel : undefined}
                                  isBackside={true}
                                />
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3.5 sm:gap-4 items-start justify-items-center w-full">
                          {sheet.pageUsers.map((user) => (
                            <div key={`preview-user-${user.id}-${sheet.isBackside ? "back" : "front"}`} className="flex justify-center w-full min-w-0">
                              <CredentialBadge
                                user={user}
                                qrDataUrl={qrDataUrls[user.id]}
                                options={options}
                                scale={zoomLevel !== 1 ? zoomLevel : undefined}
                                isBackside={sheet.isBackside}
                              />
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      // PVC
                      <div className="flex justify-center w-full">
                        {sheet.pageUsers[0] && (
                          <CredentialBadge
                            user={sheet.pageUsers[0]}
                            qrDataUrl={qrDataUrls[sheet.pageUsers[0].id]}
                            options={{ ...options, showCropMarks: false }}
                            scale={zoomLevel !== 1 ? zoomLevel : undefined}
                            isBackside={sheet.isBackside}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {ReactDOM.createPortal(modalContent, document.body)}
      {ReactDOM.createPortal(printPortalContent, document.body)}
    </>
  );
}
