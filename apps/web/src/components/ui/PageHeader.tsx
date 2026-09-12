import React, { ReactNode } from "react";
import { clsx } from "clsx";

export interface PageHeaderProps {
  title: string;
  titleBadge?: ReactNode;
  subtitle: string;
  icon: React.ElementType;
  iconVariant?: "emerald" | "cyan" | "indigo" | "amber" | "rose";
  actionButtons?: ReactNode;
  className?: string;
}

const ICON_VARIANT_MAP = {
  emerald: {
    wrapper: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    shadow: "0 0 25px -5px rgba(16, 185, 129, 0.3)",
  },
  cyan: {
    wrapper: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
    shadow: "0 0 25px -5px rgba(6, 182, 212, 0.3)",
  },
  indigo: {
    wrapper: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
    shadow: "0 0 25px -5px rgba(99, 102, 241, 0.3)",
  },
  amber: {
    wrapper: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    shadow: "0 0 25px -5px rgba(245, 158, 11, 0.3)",
  },
  rose: {
    wrapper: "bg-rose-500/10 border-rose-500/30 text-rose-400",
    shadow: "0 0 25px -5px rgba(244, 63, 94, 0.3)",
  },
};

export function PageHeader({
  title,
  titleBadge,
  subtitle,
  icon: Icon,
  iconVariant = "emerald",
  actionButtons,
  className,
}: PageHeaderProps) {
  const v = ICON_VARIANT_MAP[iconVariant] || ICON_VARIANT_MAP.emerald;

  return (
    <section className={clsx("flex flex-col md:flex-row md:items-center justify-between gap-4", className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
              v.wrapper,
            )}
            style={{ boxShadow: v.shadow }}
          >
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-surface-900 dark:text-white tracking-tight flex items-center gap-2">
              {title}
              {titleBadge && titleBadge}
            </h1>
            <p className="text-xs text-surface-500 dark:text-surface-400 font-normal">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      {actionButtons && (
        <div className="flex items-center gap-2.5 shrink-0">
          {actionButtons}
        </div>
      )}
    </section>
  );
}
