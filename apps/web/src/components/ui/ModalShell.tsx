"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, LucideIcon } from "lucide-react";
import { clsx } from "clsx";

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: string;
  icon?: LucideIcon;
  iconVariant?: "primary" | "warning" | "danger" | "info" | "success";
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const MAX_WIDTHS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

const ICON_VARIANTS = {
  primary: "bg-primary-400/15 text-primary-300 ring-1 ring-primary-400/30",
  warning: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  danger: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
  info: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
  success: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
};

export function ModalShell({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  iconVariant = "primary",
  maxWidth = "lg",
  children,
  footer,
  className,
}: ModalShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
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
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop covering 100% of entire browser window */}
      <div
        className="fixed inset-0 bg-surface-950/80 backdrop-blur-md transition-opacity animate-fade-in-up"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className={clsx(
          "relative w-full z-10 my-auto rounded-3xl overflow-hidden shadow-2xl",
          "border border-surface-200 dark:border-primary-400/20 animate-scale-up flex flex-col max-h-[90vh]",
          "bg-surface-50/95 dark:bg-[#0a111c]/95 backdrop-blur-xl",
          MAX_WIDTHS[maxWidth] || MAX_WIDTHS.lg,
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-surface-200 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3.5 pr-6">
            {Icon && (
              <div
                className={clsx(
                  "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner",
                  ICON_VARIANTS[iconVariant]
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-surface-900 dark:text-white tracking-tight">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-surface-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-surface-500 hover:text-surface-900 hover:bg-surface-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 transition-all flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:focus:ring-primary-400/50 cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-surface-200 dark:border-white/10 bg-surface-100/50 dark:bg-surface-950/40 flex items-center justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
