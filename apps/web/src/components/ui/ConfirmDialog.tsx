"use client";

import React from "react";
import { AlertTriangle, Trash2, HelpCircle, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { ModalShell } from "./ModalShell";
import { Button } from "./Button";

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
      <Button
        type="button"
        variant="secondary"
        size="lg"
        disabled={isLoading}
        onClick={onCancel}
      >
        {cancelText}
      </Button>

      <button
        type="button"
        disabled={isLoading}
        onClick={onConfirm}
        className={clsx(
          "h-10 px-5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50",
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
      preventClose={isLoading}
      closeOnBackdropClick={!isLoading}
      title={title}
      description={description}
      icon={config.icon}
      iconVariant={variant}
      maxWidth="md"
      footer={footer}
    />
  );
}
