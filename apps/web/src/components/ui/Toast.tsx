"use client";

import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { clsx } from "clsx";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle2,
    iconColor: "text-primary-400",
    border: "border-primary-400/30",
    bg: "bg-surface-900/95",
    glow: "shadow-primary-950/50",
    badge: "bg-primary-400/15",
  },
  error: {
    icon: AlertCircle,
    iconColor: "text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-surface-900/95",
    glow: "shadow-rose-950/50",
    badge: "bg-rose-500/15",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-surface-900/95",
    glow: "shadow-amber-950/50",
    badge: "bg-amber-500/15",
  },
  info: {
    icon: Info,
    iconColor: "text-sky-400",
    border: "border-sky-500/30",
    bg: "bg-surface-900/95",
    glow: "shadow-sky-950/50",
    badge: "bg-sky-500/15",
  },
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;
  const Icon = config.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium text-white shadow-2xl backdrop-blur-xl transition-all duration-300 animate-scale-up pointer-events-auto max-w-md w-full",
        config.bg,
        config.border,
        config.glow
      )}
      style={{
        boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.7)",
      }}
    >
      <div className={clsx("p-1.5 rounded-xl flex-shrink-0", config.badge)}>
        <Icon className={clsx("w-4 h-4", config.iconColor)} />
      </div>

      <p className="flex-1 text-xs sm:text-sm text-slate-200 leading-snug">
        {toast.message}
      </p>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
        aria-label="Cerrar notificación"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
