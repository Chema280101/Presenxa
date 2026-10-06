"use client";

import React from "react";
import { Edit2, UserX, X, Users, CheckSquare, Printer } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onOpenBulkEdit: () => void;
  onOpenBulkDeactivate: () => void;
  onOpenBulkPrint: () => void;
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onOpenBulkEdit,
  onOpenBulkDeactivate,
  onOpenBulkPrint,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Acciones masivas de colaboradores"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[94%] sm:w-auto shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] animate-fade-in-up"
    >
      <div className="bg-surface-900/95 dark:bg-surface-950/95 backdrop-blur-2xl border border-surface-700/70 dark:border-surface-700 text-white rounded-2xl px-4 py-2.5 flex items-center justify-between gap-4 ring-1 ring-white/10">
        {/* Contador de seleccionados */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center ring-1 ring-primary-500/30">
            <CheckSquare className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-semibold tracking-wide text-white">
            <span className="font-extrabold text-primary-400">{selectedCount}</span>{" "}
            {selectedCount === 1 ? "seleccionado" : "seleccionados"}
          </span>
        </div>

        {/* Separador vertical */}
        <div className="h-5 w-px bg-surface-700 dark:bg-white/10 shrink-0" />

        {/* Botones de acción */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Imprimir credenciales */}
          <button
            type="button"
            onClick={onOpenBulkPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            title="Diseñar e imprimir credenciales oficiales en lote"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>Credenciales</span>
          </button>

          {/* Editar en lote */}
          <button
            type="button"
            onClick={onOpenBulkEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-white dark:bg-white/10 dark:hover:bg-white/15 border border-surface-700/50 dark:border-white/10 transition cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            title="Modificar sede, rol o turnos en lote"
          >
            <Edit2 className="w-3.5 h-3.5 text-primary-400" />
            <span>Editar</span>
          </button>

          {/* Dar de baja */}
          <button
            type="button"
            onClick={onOpenBulkDeactivate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            title="Desactivar colaboradores seleccionados"
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Baja</span>
          </button>

          {/* Botón cerrar / deseleccionar */}
          <button
            type="button"
            onClick={onClearSelection}
            className="w-7 h-7 ml-1 rounded-xl flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-800 dark:hover:bg-white/10 transition cursor-pointer"
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
