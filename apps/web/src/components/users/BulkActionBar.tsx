"use client";

import React from "react";
import { Edit2, UserX, X, Users, CheckSquare, Printer, Calendar } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onOpenBulkEdit: () => void;
  onOpenBulkDeactivate: () => void;
  onOpenBulkPrint: () => void;
  onOpenBulkOverride: () => void;
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onOpenBulkEdit,
  onOpenBulkDeactivate,
  onOpenBulkPrint,
  onOpenBulkOverride,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Acciones masivas de colaboradores"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-fit max-w-[calc(100vw-2rem)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] animate-fade-in-up"
    >
      <div className="bg-surface-900/95 dark:bg-surface-950/95 backdrop-blur-2xl border border-surface-700/70 dark:border-surface-700 text-white rounded-2xl px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-2.5 sm:gap-4 ring-1 ring-white/10">
        {/* Contador de seleccionados */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center ring-1 ring-primary-500/30">
            <CheckSquare className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-semibold tracking-wide text-white whitespace-nowrap">
            <span className="font-extrabold text-primary-400">{selectedCount}</span>{" "}
            <span className="hidden sm:inline">
              {selectedCount === 1 ? "seleccionado" : "seleccionados"}
            </span>
          </span>
        </div>

        {/* Separador vertical */}
        <div className="h-5 w-px bg-surface-700 dark:bg-white/10 shrink-0" />

        {/* Botones de acción */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Imprimir credenciales (Primary / Verde — coincide con botón QR de la tabla) */}
          <button
            type="button"
            onClick={onOpenBulkPrint}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary-500/15 hover:bg-primary-500/25 text-primary-300 border border-primary-500/30 transition cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            title="Diseñar e imprimir credenciales oficiales en lote"
          >
            <Printer className="w-3.5 h-3.5 text-primary-400 shrink-0" />
            <span className="hidden sm:inline">Credenciales</span>
          </button>

          {/* Excepción 1 Día (Info / Celeste Sky — coincide con botón Excepción de la tabla) */}
          <button
            type="button"
            onClick={onOpenBulkOverride}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            title="Asignar Excepción Temporal de 1 Día"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="hidden sm:inline">Excepción</span>
          </button>

          {/* Editar en lote (Warning / Ámbar — coincide con botón Editar de la tabla) */}
          <button
            type="button"
            onClick={onOpenBulkEdit}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            title="Modificar sede, rol o turnos en lote"
          >
            <Edit2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Editar</span>
          </button>

          {/* Dar de baja (Danger / Rojo — coincide con botón Desactivar de la tabla) */}
          <button
            type="button"
            onClick={onOpenBulkDeactivate}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-danger-500/15 hover:bg-danger-500/25 text-danger-300 border border-danger-500/30 transition cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            title="Desactivar colaboradores seleccionados"
          >
            <UserX className="w-3.5 h-3.5 text-danger-400 shrink-0" />
            <span className="hidden sm:inline">Baja</span>
          </button>

          {/* Botón cerrar / deseleccionar */}
          <button
            type="button"
            onClick={onClearSelection}
            className="w-7 h-7 ml-0.5 sm:ml-1 rounded-xl flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-800 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
            title="Deseleccionar todos"
            aria-label="Deseleccionar todos"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
