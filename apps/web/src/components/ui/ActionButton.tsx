"use client";

import React, { forwardRef } from "react";
import { clsx } from "clsx";

export type ActionButtonVariant =
  | "neutral"
  | "primary"
  | "danger"
  | "success"
  | "info"
  | "warning"
  | "edit";

export type ActionButtonSize = "sm" | "md" | "lg";

export interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const variantStyles: Record<ActionButtonVariant, string> = {
  neutral:
    "bg-white hover:bg-surface-100 text-surface-600 hover:text-surface-900 border border-surface-200/90 shadow-2xs hover:border-surface-300 dark:bg-surface-850 dark:hover:bg-surface-800 dark:text-surface-300 dark:hover:text-white dark:border-surface-700/70 dark:hover:border-surface-600 dark:shadow-none",
  primary:
    "bg-primary-50/80 hover:bg-primary-100 text-primary-700 hover:text-primary-800 border border-primary-200/90 shadow-2xs hover:border-primary-300 dark:bg-primary-500/10 dark:hover:bg-primary-500/20 dark:text-primary-300 dark:hover:text-primary-200 dark:border-primary-500/30 dark:hover:border-primary-500/50 dark:shadow-none",
  danger:
    "bg-danger-50 hover:bg-danger-100 text-danger-700 hover:text-danger-800 border border-danger-200 shadow-2xs hover:border-danger-300 dark:bg-danger-500/15 dark:hover:bg-danger-500/25 dark:text-danger-400 dark:hover:text-danger-300 dark:border-danger-500/35 dark:hover:border-danger-500/60 dark:shadow-none",
  success:
    "bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200/90 shadow-2xs hover:border-emerald-300 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-300 dark:hover:text-emerald-200 dark:border-emerald-500/30 dark:hover:border-emerald-500/50 dark:shadow-none",
  info:
    "bg-sky-50/80 hover:bg-sky-100 text-sky-700 hover:text-sky-800 border border-sky-200/90 shadow-2xs hover:border-sky-300 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 dark:text-sky-300 dark:hover:text-sky-200 dark:border-sky-500/30 dark:hover:border-sky-500/50 dark:shadow-none",
  warning:
    "bg-amber-50/80 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border border-amber-200/90 shadow-2xs hover:border-amber-300 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-400 dark:hover:text-amber-300 dark:border-amber-500/30 dark:hover:border-amber-500/50 dark:shadow-none",
  edit:
    "bg-amber-50/80 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border border-amber-200/90 shadow-2xs hover:border-amber-300 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-400 dark:hover:text-amber-300 dark:border-amber-500/30 dark:hover:border-amber-500/50 dark:shadow-none",
};

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      variant = "neutral",
      size = "sm",
      icon,
      children,
      className,
      title,
      type = "button",
      disabled,
      ...props
    },
    ref
  ) => {
    const hasText = Boolean(children);

    const sizeClasses = {
      sm: hasText
        ? "h-8 px-2.5 rounded-lg text-xs font-semibold gap-1.5"
        : "h-8 w-8 rounded-lg",
      md: hasText
        ? "h-8.5 px-3 rounded-xl text-xs font-semibold gap-1.5"
        : "h-8.5 w-8.5 rounded-xl",
      lg: hasText
        ? "h-10 px-3.5 rounded-xl text-sm font-semibold gap-2"
        : "h-10 w-10 rounded-xl",
    }[size];

    return (
      <button
        ref={ref}
        type={type}
        title={title}
        aria-label={props["aria-label"] || title}
        disabled={disabled}
        className={clsx(
          "inline-flex items-center justify-center shrink-0 font-medium transition-all duration-150 ease-out cursor-pointer select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-surface-900",
          "active:scale-95",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100",
          sizeClasses,
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {icon && <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>}
        {children}
      </button>
    );
  }
);

ActionButton.displayName = "ActionButton";

export function ActionButtonGroup({
  children,
  className,
  align = "right",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-1.5",
        {
          "justify-start": align === "left",
          "justify-center": align === "center",
          "justify-end": align === "right",
        },
        className
      )}
    >
      {children}
    </div>
  );
}
