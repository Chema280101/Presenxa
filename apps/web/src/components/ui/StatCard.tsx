import React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { clsx } from "clsx";

export interface StatCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  subValue?: string | number;
  icon: React.ElementType; // Can be LucideIcon or generic SVG
  variant?: "emerald" | "cyan" | "amber" | "rose" | "indigo" | "default";
  trend?: {
    value: string | number;
    label: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

const VARIANT_MAP = {
  emerald: {
    hoverBorder: "hover:border-emerald-500/30",
    orb: "bg-emerald-500/10 group-hover:bg-emerald-500/20",
    iconBg: "bg-emerald-500/10",
    iconBorder: "border-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconShadow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
    trendBg: "bg-emerald-500/10",
    trendText: "text-emerald-700 dark:text-emerald-400",
    subValueText: "text-emerald-700 dark:text-emerald-300",
  },
  cyan: {
    hoverBorder: "hover:border-cyan-500/30",
    orb: "bg-cyan-500/10 group-hover:bg-cyan-500/20",
    iconBg: "bg-cyan-500/10",
    iconBorder: "border-cyan-500/20",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    iconShadow: "shadow-[0_0_15px_rgba(6,182,212,0.15)]",
    trendBg: "bg-cyan-500/10",
    trendText: "text-cyan-700 dark:text-cyan-400",
    subValueText: "text-cyan-700 dark:text-cyan-300",
  },
  amber: {
    hoverBorder: "hover:border-amber-500/30",
    orb: "bg-amber-500/10 group-hover:bg-amber-500/20",
    iconBg: "bg-amber-500/10",
    iconBorder: "border-amber-500/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    iconShadow: "shadow-[0_0_15px_rgba(245,158,11,0.15)]",
    trendBg: "bg-amber-500/10",
    trendText: "text-amber-700 dark:text-amber-400",
    subValueText: "text-amber-700 dark:text-amber-300",
  },
  rose: {
    hoverBorder: "hover:border-rose-500/30",
    orb: "bg-rose-500/10 group-hover:bg-rose-500/20",
    iconBg: "bg-rose-500/10",
    iconBorder: "border-rose-500/20",
    iconColor: "text-rose-600 dark:text-rose-400",
    iconShadow: "shadow-[0_0_15px_rgba(244,63,94,0.15)]",
    trendBg: "bg-rose-500/10",
    trendText: "text-rose-700 dark:text-rose-400",
    subValueText: "text-rose-700 dark:text-rose-300",
  },
  indigo: {
    hoverBorder: "hover:border-indigo-500/30",
    orb: "bg-indigo-500/10 group-hover:bg-indigo-500/20",
    iconBg: "bg-indigo-500/10",
    iconBorder: "border-indigo-500/20",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    iconShadow: "shadow-[0_0_15px_rgba(99,102,241,0.15)]",
    trendBg: "bg-indigo-500/10",
    trendText: "text-indigo-700 dark:text-indigo-400",
    subValueText: "text-indigo-700 dark:text-indigo-300",
  },
  default: {
    hoverBorder: "hover:border-surface-300 dark:hover:border-surface-700",
    orb: "bg-surface-200 dark:bg-surface-800 group-hover:bg-surface-300 dark:group-hover:bg-surface-700",
    iconBg: "bg-surface-100 dark:bg-white/5",
    iconBorder: "border-surface-200 dark:border-white/10",
    iconColor: "text-surface-600 dark:text-surface-300",
    iconShadow: "shadow-none",
    trendBg: "bg-surface-200 dark:bg-white/10",
    trendText: "text-surface-600 dark:text-surface-300",
    subValueText: "text-surface-900 dark:text-white",
  },
};

export function StatCard({
  label,
  value,
  subLabel,
  subValue,
  icon: Icon,
  variant = "default",
  trend,
  onClick,
  className,
}: StatCardProps) {
  const v = VARIANT_MAP[variant] || VARIANT_MAP.default;

  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={clsx(
        "command-card p-5 relative group overflow-hidden transition-colors flex flex-col justify-between h-full",
        v.hoverBorder,
        onClick &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-950",
        className
      )}
    >
      {/* Ambient Orb */}
      <div
        aria-hidden="true"
        className={clsx(
          "absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl transition-colors pointer-events-none",
          v.orb
        )}
      />

      {/* Top Header + Middle Trend */}
      <div>
        <div className="flex justify-between items-start gap-3 mb-4 relative z-10">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-1">
              {label}
            </p>
            <p className="text-3xl font-black text-surface-900 dark:text-white tracking-tight font-sans font-tabular">
              {value}
            </p>
          </div>
          <div
            aria-hidden="true"
            className={clsx(
              "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105",
              v.iconBg,
              v.iconBorder,
              v.iconColor,
              v.iconShadow
            )}
          >
            <Icon className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
          </div>
        </div>

        {/* Middle Trend Section */}
        {trend ? (
          <div className="flex items-center flex-wrap gap-2 text-xs relative z-10">
            <span
              className={clsx(
                "inline-flex items-center font-bold font-tabular px-1.5 py-0.5 rounded",
                trend.isNeutral
                  ? "text-surface-600 bg-surface-200 dark:text-surface-400 dark:bg-white/5"
                  : trend.isPositive
                    ? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-400"
                    : "text-rose-700 bg-rose-500/10 dark:text-rose-400"
              )}
            >
              {trend.isPositive && !trend.isNeutral && (
                <ArrowUp aria-hidden="true" className="w-3 h-3 mr-1 shrink-0" strokeWidth={2.5} />
              )}
              {!trend.isPositive && !trend.isNeutral && (
                <ArrowDown aria-hidden="true" className="w-3 h-3 mr-1 shrink-0" strokeWidth={2.5} />
              )}
              {trend.value}
            </span>
            <span className="text-surface-500 dark:text-surface-400">{trend.label}</span>
          </div>
        ) : (
          <div aria-hidden="true" className="flex items-center gap-2 text-xs relative z-10 opacity-0 select-none">
            <span className="inline-flex items-center font-bold px-1.5 py-0.5 rounded">0</span>
          </div>
        )}
      </div>

      {/* Bottom Sub-label Section */}
      {(subLabel || subValue !== undefined) && (
        <div className="mt-4 pt-3.5 border-t border-surface-200 dark:border-white/5 flex items-center justify-between gap-2 text-xs relative z-10">
          <span className="text-surface-500 dark:text-surface-400 font-sans truncate">{subLabel}</span>
          {subValue !== undefined && (
            <span className={clsx("font-bold font-mono font-tabular shrink-0", v.subValueText)}>{subValue}</span>
          )}
        </div>
      )}
    </div>
  );
}
