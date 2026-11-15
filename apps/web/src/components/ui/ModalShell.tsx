"use client";

import React, { useEffect, useId, useRef, useState } from "react";
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
  /**
   * "dialog" renders a centered modal on all viewports.
   * "sheet" renders a bottom-sheet on mobile and centered modal on sm+ viewports.
   */
  variant?: "dialog" | "sheet";
  /** Allow closing when clicking the backdrop (default: true). Ignored when preventClose is true. */
  closeOnBackdropClick?: boolean;
  /** Prevent closing via backdrop, Escape key, or close button (e.g. while submitting). */
  preventClose?: boolean;
  children?: React.ReactNode;
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
  primary: "bg-primary-50 text-primary-600 ring-1 ring-primary-200 dark:bg-primary-400/15 dark:text-primary-300 dark:ring-primary-400/30",
  warning: "bg-amber-50 text-amber-600 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  danger: "bg-rose-50 text-rose-600 ring-1 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
  info: "bg-sky-50 text-sky-600 ring-1 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30",
  success: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
};

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function ModalShell({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  iconVariant = "primary",
  maxWidth = "lg",
  variant = "dialog",
  closeOnBackdropClick = true,
  preventClose = false,
  children,
  footer,
  className,
}: ModalShellProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !mounted) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    // Move focus inside the dialog on open
    const focusTimer = requestAnimationFrame(() => {
      const dialogEl = dialogRef.current;
      if (!dialogEl) return;
      if (dialogEl.contains(document.activeElement)) return;

      const focusable = dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      // Prefer focusing the first form control or action over the top-right close button if possible
      const firstFormControl = Array.from(focusable).find(
        (el) => el.getAttribute("aria-label") !== "Cerrar modal"
      );
      (firstFormControl || focusable[0] || dialogEl).focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!preventClose) {
          onCloseRef.current();
        }
        return;
      }

      if (e.key === "Tab") {
        const dialogEl = dialogRef.current;
        if (!dialogEl) return;

        // Allow portaled listboxes (e.g. searchable CustomSelect) to handle their own Tab close
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl?.closest('[role="listbox"]')) {
          return;
        }

        const focusable = Array.from(
          dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);

        if (focusable.length === 0) {
          e.preventDefault();
          dialogEl.focus();
          return;
        }

        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl || !dialogEl.contains(document.activeElement)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl || !dialogEl.contains(document.activeElement)) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusTimer);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);

      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function" && document.contains(prev)) {
        prev.focus();
      }
    };
  }, [isOpen, mounted, preventClose]);

  if (!isOpen || !mounted) return null;

  const handleBackdropClick = () => {
    if (!preventClose && closeOnBackdropClick) {
      onClose();
    }
  };

  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 z-50 flex overflow-y-auto print:hidden",
        variant === "sheet"
          ? "flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-6"
          : "items-center justify-center p-4 sm:p-6"
      )}
    >
      {/* Backdrop covering 100% of entire browser window */}
      <div
        className="fixed inset-0 bg-surface-950/80 backdrop-blur-md transition-opacity animate-fade-in-up"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={clsx(
          "relative w-full z-10 overflow-hidden shadow-2xl outline-none",
          "border border-surface-200 dark:border-surface-800 flex flex-col max-h-[92dvh]",
          "bg-surface-50/95 dark:bg-surface-900/95 backdrop-blur-xl",
          variant === "sheet"
            ? "rounded-t-3xl sm:rounded-3xl sm:my-auto animate-[slide-up_0.25s_cubic-bezier(0.16,1,0.3,1)] sm:animate-scale-up"
            : "my-auto rounded-2xl sm:rounded-3xl animate-scale-up",
          MAX_WIDTHS[maxWidth] || MAX_WIDTHS.lg,
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        {variant === "sheet" && (
          <div
            className="w-full flex justify-center pt-3 pb-1 sm:hidden cursor-pointer flex-shrink-0"
            onClick={() => !preventClose && onClose()}
          >
            <div className="w-12 h-1.5 rounded-full bg-surface-300 dark:bg-surface-700" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-surface-200 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3 pr-3 sm:pr-6 min-w-0">
            {Icon && (
              <div
                className={clsx(
                  "w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner",
                  ICON_VARIANTS[iconVariant]
                )}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3
                id={titleId}
                className="text-base sm:text-lg font-bold text-surface-900 dark:text-white tracking-tight truncate sm:whitespace-normal"
              >
                {title}
              </h3>
              {description && (
                <p
                  id={descriptionId}
                  className="text-xs text-surface-500 dark:text-slate-400 mt-0.5 leading-relaxed"
                >
                  {description}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={preventClose}
            onClick={onClose}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-surface-500 hover:text-surface-900 hover:bg-surface-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 transition-all flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 dark:focus-visible:ring-primary-400/60 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content Body (only rendered when children are provided) */}
        {children !== undefined && children !== null && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {children}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-surface-200 dark:border-white/10 bg-surface-100/50 dark:bg-surface-950/40 flex flex-wrap items-center justify-end gap-2 sm:gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
