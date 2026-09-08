"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, HelpCircle, X, Loader2 } from "lucide-react";
import { clsx } from "clsx";

export type ConfirmVariant = "danger" | "warning" | "primary";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_CONFIG = {
  danger: {
    icon: Trash2,
    iconWrapper: "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30",
    confirmBtn:
      "bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-950/50 focus:ring-rose-500/50",
  },
  warning: {
    icon: AlertTriangle,
    iconWrapper: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    confirmBtn:
      "bg-amber-500 hover:bg-amber-400 text-surface-950 font-bold shadow-lg shadow-amber-950/50 focus:ring-amber-500/50",
  },
  primary: {
    icon: HelpCircle,
    iconWrapper: "bg-primary-400/15 text-primary-300 ring-1 ring-primary-400/30",
    confirmBtn:
      "bg-primary-400 hover:bg-primary-300 text-surface-950 font-bold shadow-lg shadow-primary-950/50 focus:ring-primary-400/50",
  },
};

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard navigation: Escape cancels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onCancel();
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
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen || !mounted) return null;

  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.danger;
  const Icon = config.icon;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-surface-950/80 backdrop-blur-md transition-opacity animate-fade-in-up"
        onClick={() => !isLoading && onCancel()}
        aria-hidden="true"
      />

      {/* Dialog Card */}
      <div
        className="relative w-full max-w-md z-10 my-auto rounded-3xl overflow-hidden shadow-2xl shadow-black/90 border border-white/10 animate-scale-up flex flex-col"
        style={{
          background: "rgba(10, 27, 44, 0.98)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div
              className={clsx(
                "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner",
                config.iconWrapper
              )}
            >
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <h3
                id="confirm-dialog-title"
                className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug"
              >
                {title}
              </h3>
              <p
                id="confirm-dialog-description"
                className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed"
              >
                {description}
              </p>
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer disabled:opacity-50"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-white/10 bg-surface-950/50 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 disabled:opacity-50",
              config.confirmBtn
            )}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
