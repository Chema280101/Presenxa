"use client";

import React, { forwardRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

export interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export type ButtonAsButton = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: undefined;
  };

export type ButtonAsLink = ButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    href: string;
    external?: boolean;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 hover:bg-primary-600 text-white font-bold shadow-sm shadow-primary-500/25 hover:shadow-primary-500/35 border border-primary-600/30 dark:bg-primary-500 dark:hover:bg-primary-400 dark:text-white dark:border-primary-400/30 dark:shadow-primary-500/20",
  secondary:
    "bg-surface-100 hover:bg-surface-200 text-surface-700 hover:text-surface-900 border border-surface-200/90 hover:border-surface-300 shadow-2xs dark:bg-surface-850 dark:hover:bg-surface-800 dark:text-slate-300 dark:hover:text-white dark:border-surface-700/70 dark:hover:border-surface-600 dark:shadow-none font-semibold",
  outline:
    "bg-transparent hover:bg-surface-100 text-surface-700 hover:text-surface-900 border border-surface-300 hover:border-surface-400 dark:text-slate-300 dark:hover:text-white dark:border-surface-700 dark:hover:border-surface-600 dark:hover:bg-surface-800 font-semibold",
  ghost:
    "bg-transparent hover:bg-surface-100 text-surface-600 hover:text-surface-900 dark:text-slate-400 dark:hover:text-white dark:hover:bg-surface-800 font-semibold",
  danger:
    "bg-danger-500 hover:bg-danger-600 text-white font-bold shadow-sm shadow-danger-500/25 hover:shadow-danger-500/35 border border-danger-600/30 dark:bg-danger-600 dark:hover:bg-danger-500 dark:text-white dark:shadow-danger-600/20",
};

export const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 rounded-lg text-xs font-semibold gap-1.5",
  md: "h-9 px-3.5 rounded-xl text-xs font-semibold gap-2",
  lg: "h-10 px-4.5 rounded-xl text-sm font-semibold gap-2.5",
  icon: "h-9 w-9 p-0 rounded-xl justify-center shrink-0",
  "icon-sm": "h-8 w-8 p-0 rounded-lg justify-center shrink-0",
};

export const baseButtonStyles =
  "inline-flex items-center justify-center shrink-0 select-none transition-all duration-150 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-surface-900 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100 aria-disabled:opacity-50 aria-disabled:pointer-events-none";

export function getButtonClasses({
  variant = "secondary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return clsx(baseButtonStyles, sizeStyles[size], variantStyles[variant], className);
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      variant = "secondary",
      size = "md",
      isLoading = false,
      icon,
      iconPosition = "left",
      children,
      className,
      disabled,
      ...restProps
    },
    ref
  ) => {
    const computedClass = getButtonClasses({ variant, size, className });

    const displayedIcon = isLoading ? (
      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin shrink-0" />
    ) : icon ? (
      <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>
    ) : null;

    const content = (
      <>
        {displayedIcon && iconPosition === "left" && displayedIcon}
        {children && <span>{children}</span>}
        {displayedIcon && iconPosition === "right" && displayedIcon}
      </>
    );

    if ("href" in restProps && restProps.href !== undefined) {
      const { href, external, ...anchorProps } = restProps as ButtonAsLink;

      if (external || href.startsWith("http") || href.startsWith("/api/")) {
        return (
          <a
            ref={ref as React.Ref<HTMLAnchorElement>}
            href={href}
            className={computedClass}
            aria-disabled={disabled || isLoading}
            {...anchorProps}
          >
            {content}
          </a>
        );
      }

      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={computedClass}
          aria-disabled={disabled || isLoading}
          {...anchorProps}
        >
          {content}
        </Link>
      );
    }

    const buttonProps = restProps as ButtonAsButton;

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={buttonProps.type || "button"}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={computedClass}
        {...buttonProps}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";
