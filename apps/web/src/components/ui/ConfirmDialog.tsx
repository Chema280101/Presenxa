"use client";

import React from "react";
import { AlertTriangle, Trash2, HelpCircle, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { ModalShell } from "./ModalShell";

export type ConfirmVariant = "danger" | "warning" | "primary" | "info";

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
    confirmBtn:
      "bg-danger-500 hover:bg-danger-600 text-white shadow-sm hover:shadow focus:ring-danger-500/50",
  },
  warning: {
    icon: AlertTriangle,
    confirmBtn:
      "bg-warning-500 hover:bg-warning-600 text-white font-bold shadow-sm hover:shadow focus:ring-warning-500/50",
  },
  primary: {
    icon: HelpCircle,
    confirmBtn:
      "bg-primary-500 hover:bg-primary-600 text-white font-bold shadow-sm hover:shadow focus:ring-primary-500/50",
  },
  info: {
    icon: HelpCircle,
    confirmBtn:
      "bg-info-500 hover:bg-info-600 text-white font-bold shadow-sm hover:shadow focus:ring-info-500/50",
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
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.danger;

  const footer = (
    <>
      <button
        type="button"
        disabled={isLoading}
        onClick={onCancel}
        className="h-10 px-5 rounded-xl bg-danger-50 hover:bg-danger-100 text-danger-700 hover:text-danger-800 border border-danger-200 hover:border-danger-300 dark:bg-danger-500/10 dark:hover:bg-danger-500/20 dark:text-danger-300 dark:hover:text-danger-200 dark:border-danger-500/30 dark:hover:border-danger-500/50 text-sm font-semibold flex items-center justify-center transition cursor-pointer disabled:opacity-50"
      >
        {cancelText}
      </button>

      <button
        type="button"
        disabled={isLoading}
        onClick={onConfirm}
        className={clsx(
          "h-10 px-5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 disabled:opacity-50",
          config.confirmBtn
        )}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{confirmText}</span>
      </button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => !isLoading && onCancel()}
      title={title}
      description={description}
      icon={config.icon}
      iconVariant={variant}
      maxWidth="md"
      footer={footer}
    >
      <div className="hidden" />
    </ModalShell>
  );
}
