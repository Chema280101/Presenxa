"use client";

import React, { useState } from "react";
import {
  BookOpen,
  FileDown,
  ExternalLink,
  Loader2,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { clsx } from "clsx";
import { useToast } from "@/providers/ToastProvider";

export interface AdminManualButtonProps {
  variant?: "sidebar" | "topbar-item" | "topbar-icon" | "card" | "header-button";
  userRole?: string | null;
  className?: string;
  onDownloaded?: () => void;
}

const ADMIN_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "Administrador",
  "Super Admin",
  "Super Administrador",
  "ADMINISTRADOR",
  "SUPER ADMIN",
];

export function AdminManualButton({
  variant = "header-button",
  userRole,
  className,
  onDownloaded,
}: AdminManualButtonProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  // Verificación estricta de rol: Si se pasa rol y no es admin, no renderizar
  if (userRole && !ADMIN_ROLES.includes(userRole)) {
    return null;
  }

  const handleDownload = async (e?: React.MouseEvent, inline = false) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isDownloading) return;

    try {
      setIsDownloading(true);
      toast.info(inline ? "Abriendo manual en nueva pestaña..." : "Preparando descarga del Manual de Administrador...");

      if (inline) {
        window.open("/api/admin/manual?inline=1", "_blank", "noopener,noreferrer");
        setIsDownloading(false);
        return;
      }

      // Descarga directa vía API protegida
      const response = await fetch("/api/admin/manual");
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Solo usuarios con rol Administrador tienen acceso a este documento.");
        }
        throw new Error("No se pudo obtener el manual del servidor.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Manual_Administrador_Hotel_Italia.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Manual de Hotel Italia descargado correctamente");
      onDownloaded?.();
    } catch (error: any) {
      console.error("[ManualDownload] Error:", error);
      toast.error(error.message || "Error al descargar el manual");
    } finally {
      setIsDownloading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. VARIANTE: SIDEBAR (Tarjeta interactiva en menú lateral)
  // ─────────────────────────────────────────────────────────────
  if (variant === "sidebar") {
    return (
      <div
        className={clsx(
          "p-3 rounded-2xl bg-surface-100/80 dark:bg-surface-900/80 border border-surface-200 dark:border-surface-800/80 hover:border-primary-500/40 dark:hover:border-primary-500/40 transition-all duration-200 group shadow-sm flex flex-col gap-2.5",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 flex items-center justify-center shrink-0 border border-primary-200 dark:border-primary-500/30 group-hover:scale-105 transition-transform">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-surface-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                Manual Hotel Italia
              </p>
              <p className="text-[10px] text-surface-500 dark:text-surface-400 font-mono">
                Guía Oficial PDF
              </p>
            </div>
          </div>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/50 uppercase tracking-wider">
            ADMIN
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-surface-200/70 dark:border-surface-800">
          <button
            type="button"
            onClick={(e) => handleDownload(e, false)}
            disabled={isDownloading}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-[11px] font-semibold transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Descargar PDF en tu equipo"
          >
            {isDownloading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <FileDown className="w-3 h-3" />
            )}
            <span>Descargar</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleDownload(e, true)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-surface-200/80 hover:bg-surface-300 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 text-[11px] font-medium transition-all active:scale-95 cursor-pointer"
            title="Visualizar manual en pestaña del navegador"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Leer</span>
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. VARIANTE: TOPBAR-ITEM (Opción en Dropdown de Perfil)
  // ─────────────────────────────────────────────────────────────
  if (variant === "topbar-item") {
    return (
      <button
        type="button"
        onClick={(e) => handleDownload(e, false)}
        disabled={isDownloading}
        className={clsx(
          "flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-surface-700 dark:text-surface-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all duration-150 disabled:opacity-50 cursor-pointer text-left group",
          className
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary-500 shrink-0" />
          ) : (
            <BookOpen className="w-4 h-4 text-primary-500 dark:text-primary-400 shrink-0 group-hover:scale-110 transition-transform" />
          )}
          <span className="truncate">Manual del Administrador (Hotel Italia)</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-primary-600 dark:text-primary-300 bg-primary-100 dark:bg-primary-500/20 px-1.5 py-0.5 rounded border border-primary-200 dark:border-primary-500/30">
          PDF
        </span>
      </button>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. VARIANTE: TOPBAR-ICON (Botón con tooltip en cabecera)
  // ─────────────────────────────────────────────────────────────
  if (variant === "topbar-icon") {
    return (
      <button
        type="button"
        onClick={(e) => handleDownload(e, false)}
        disabled={isDownloading}
        className={clsx(
          "relative p-2 rounded-xl text-surface-500 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer group flex items-center justify-center",
          className
        )}
        title="Descargar Manual de Administrador — Hotel Italia (PDF)"
        aria-label="Descargar Manual de Administrador Hotel Italia"
      >
        {isDownloading ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
        ) : (
          <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
        )}
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
        </span>
      </button>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. VARIANTE: CARD (Tarjeta completa para /configuracion)
  // ─────────────────────────────────────────────────────────────
  if (variant === "card") {
    return (
      <section
        className={clsx(
          "bg-white dark:bg-surface-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 relative border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden group hover:border-primary-500/30 transition-all duration-300",
          className
        )}
      >
        {/* Decorative backdrop glow */}
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 rounded-full bg-primary-500/10 blur-2xl pointer-events-none group-hover:bg-primary-500/15 transition-all" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 border border-primary-200/60 dark:border-primary-800/40 shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Manual de Administrador — Hotel Italia</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/40">
                  OFICIAL
                </span>
              </h3>
              <p className="text-[11px] text-surface-500 dark:text-surface-400 font-medium">
                Guía Oficial de Control de Asistencias & Operaciones · Hotel Italia
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex text-[10px] font-mono text-surface-500 dark:text-surface-400 bg-surface-100 dark:bg-surface-800 px-2.5 py-1 rounded-full border border-surface-200 dark:border-surface-700">
            PDF · 422 KB
          </span>
        </div>

        <p className="text-xs text-surface-600 dark:text-surface-300 mb-4 leading-relaxed">
          Documento oficial con los protocolos de asistencia, enrolamiento de colaboradores, turnos rotativos, políticas de puntualidad y calibración de terminales Kiosk en sedes de Hotel Italia.
        </p>

        {/* Feature chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 text-[11px]">
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 font-medium text-surface-700 dark:text-surface-300">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-500 shrink-0" />
            <span className="truncate">Hotel Italia</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 font-medium text-surface-700 dark:text-surface-300">
            <FileText className="w-3.5 h-3.5 text-primary-500 shrink-0" />
            <span className="truncate">Exclusivo Admins</span>
          </div>
          <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5 p-2 rounded-xl bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 font-medium text-surface-700 dark:text-surface-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary-500 shrink-0" />
            <span className="truncate">Guía Oficial v2.4</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t border-surface-200 dark:border-surface-800">
          <button
            type="button"
            onClick={(e) => handleDownload(e, false)}
            disabled={isDownloading}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold text-xs transition-all shadow-sm hover:shadow-md active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span>Descargar Manual Hotel Italia (PDF)</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleDownload(e, true)}
            className="w-full sm:w-auto py-2.5 px-3.5 rounded-xl bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 font-medium text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer border border-surface-200 dark:border-surface-700"
          >
            <ExternalLink className="w-4 h-4 text-surface-500" />
            <span>Abrir en Navegador</span>
          </button>
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 5. VARIANTE: HEADER-BUTTON (Acción en Dashboard Principal)
  // ─────────────────────────────────────────────────────────────
  return (
    <button
      type="button"
      onClick={(e) => handleDownload(e, false)}
      disabled={isDownloading}
      className={clsx(
        "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700 hover:border-primary-500/50 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-950/30 shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer group",
        className
      )}
      title="Descargar Manual Oficial de Hotel Italia en PDF"
    >
      {isDownloading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-500" />
      ) : (
        <FileDown className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform" />
      )}
      <span>Manual Hotel Italia (PDF)</span>
      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30">
        v2.4
      </span>
    </button>
  );
}
