"use client";

import React from "react";
import { LayoutGrid, List } from "lucide-react";
import { clsx } from "clsx";

export interface ViewModeOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ElementType;
  title?: string;
  badge?: number | string;
}

export const DEFAULT_VIEW_OPTIONS: ViewModeOption<"grid" | "table">[] = [
  {
    id: "grid",
    label: "Cuadrícula",
    icon: LayoutGrid,
    title: "Vista en Cuadrícula",
  },
  {
    id: "table",
    label: "Tabla",
    icon: List,
    title: "Vista en Tabla",
  },
];

export interface ViewModeToggleProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options?: ViewModeOption<T>[];
  className?: string;
  ariaLabel?: string;
  size?: "sm" | "md";
}

export function ViewModeToggle<T extends string = string>({
  value,
  onChange,
  options,
  className,
  ariaLabel = "Modo de visualización",
  size = "md",
}: ViewModeToggleProps<T>) {
  // Opciones predeterminadas con labels estandarizados: "Cuadrícula" y "Tabla"
  const resolvedOptions: ViewModeOption<T>[] =
    options ??
    (((value === "cards" || (value as string) === "table")
      ? [
          {
            id: "cards" as T,
            label: "Cuadrícula",
            icon: LayoutGrid,
            title: "Vista en Cuadrícula",
          },
          {
            id: "table" as T,
            label: "Tabla",
            icon: List,
            title: "Vista en Tabla",
          },
        ]
      : DEFAULT_VIEW_OPTIONS) as unknown as ViewModeOption<T>[]);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={clsx(
        "inline-flex items-center p-1 bg-surface-100 dark:bg-surface-800/80 rounded-xl border border-surface-200 dark:border-surface-700/60 shadow-2xs shrink-0 select-none",
        className
      )}
    >
      {resolvedOptions.map((opt) => {
        const Icon = opt.icon;
        const isActive = value === opt.id;
        const tooltip = opt.title || `Vista en ${opt.label}`;

        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={tooltip}
            onClick={() => onChange(opt.id)}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500/40",
              size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5",
              isActive
                ? "bg-white dark:bg-surface-900 text-surface-900 dark:text-white shadow-xs"
                : "text-surface-500 hover:text-surface-900 dark:hover:text-surface-200"
            )}
          >
            {Icon && (
              <Icon className="w-3.5 h-3.5 text-primary-500 shrink-0 transition-transform duration-150" />
            )}
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={clsx(
                  "ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full font-semibold transition-colors",
                  isActive
                    ? "bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300"
                    : "bg-surface-200/80 dark:bg-surface-700 text-surface-600 dark:text-surface-400"
                )}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
