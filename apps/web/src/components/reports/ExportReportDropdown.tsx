"use client";

import React, { useState, useRef, useEffect } from "react";
import { Download, ChevronDown, FileSpreadsheet, FileText, FileCode, Loader2 } from "lucide-react";

interface ExportReportDropdownProps {
  onExportExcel: () => void;
  onExportPdf?: () => void;
  onExportCsv: () => void;
  totalRecords?: number;
  periodLabel?: string;
  variant?: "primary" | "secondary";
  isLoadingPdf?: boolean;
}

export function ExportReportDropdown({
  onExportExcel,
  onExportPdf,
  onExportCsv,
  totalRecords,
  periodLabel,
  variant = "secondary",
  isLoadingPdf = false,
}: ExportReportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const buttonStyle =
    variant === "primary"
      ? "bg-primary-500 hover:bg-primary-600 text-white font-bold shadow-sm shadow-primary-500/25 border border-primary-600/30"
      : "bg-surface-100 hover:bg-surface-200 text-surface-700 hover:text-surface-900 border border-surface-200/90 hover:border-surface-300 shadow-2xs dark:bg-surface-850 dark:hover:bg-surface-800 dark:text-slate-300 dark:hover:text-white dark:border-surface-700/70 dark:hover:border-surface-600";

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-all duration-150 cursor-pointer active:scale-95 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 select-none ${buttonStyle}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="font-semibold">Exportar</span>
        <ChevronDown
          className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200/90 dark:border-surface-700/80 shadow-2xl z-50 overflow-hidden animate-fade-in-up focus:outline-none"
        >
          {/* Header informativo del menú */}
          <div className="px-4 py-2.5 bg-surface-50 dark:bg-surface-850/60 border-b border-surface-200/80 dark:border-surface-800 text-[11px] text-surface-500 dark:text-surface-400 flex items-center justify-between">
            <span>Formato de descarga</span>
            {periodLabel && (
              <span className="font-semibold text-primary-600 dark:text-emerald-400 truncate max-w-[140px]">
                {periodLabel}
              </span>
            )}
          </div>

          <div className="p-1.5 space-y-1">
            {/* Opción 1: Excel Ejecutivo (.xlsx) */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onExportExcel();
              }}
              className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-emerald-50/70 dark:hover:bg-emerald-950/20 text-left transition-colors cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-surface-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                    Excel Ejecutivo (.xlsx)
                  </p>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Recomendado
                  </span>
                </div>
                <p className="text-[11px] text-surface-500 dark:text-surface-400 leading-snug mt-0.5">
                  Hoja oficial con tarjetas KPI, badges de estado, desglose por sedes y filtros.
                </p>
              </div>
            </button>

            {/* Opción 2: Documento PDF Oficial (.pdf) */}
            {onExportPdf && (
              <button
                type="button"
                role="menuitem"
                disabled={isLoadingPdf}
                onClick={() => {
                  setIsOpen(false);
                  onExportPdf();
                }}
                className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-rose-50/70 dark:hover:bg-rose-950/20 text-left transition-colors cursor-pointer group disabled:opacity-60"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {isLoadingPdf ? (
                    <Loader2 className="w-5 h-5 animate-spin text-rose-600 dark:text-rose-400" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-surface-900 dark:text-white group-hover:text-rose-700 dark:group-hover:text-rose-400">
                      Documento PDF Oficial (.pdf)
                    </p>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      Imprimible
                    </span>
                  </div>
                  <p className="text-[11px] text-surface-500 dark:text-surface-400 leading-snug mt-0.5">
                    Reporte corporativo membretado listo para imprimir o presentar en auditorías.
                  </p>
                </div>
              </button>
            )}

            {/* Opción 3: CSV Plano (.csv) */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onExportCsv();
              }}
              className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-sky-50/70 dark:hover:bg-sky-950/20 text-left transition-colors cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileCode className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-surface-900 dark:text-white group-hover:text-sky-700 dark:group-hover:text-sky-400">
                    Archivo CSV Plano (.csv)
                  </p>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    ERP / Nómina
                  </span>
                </div>
                <p className="text-[11px] text-surface-500 dark:text-surface-400 leading-snug mt-0.5">
                  Formato delimitado por punto y coma (UTF-8 con BOM) para importación contable.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
