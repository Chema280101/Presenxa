import React from "react";
import { LucideIcon } from "lucide-react";
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

  return (
    <div
      onClick={onClick}
      className={clsx(
        "command-card p-5 relative group overflow-hidden transition-all",
        v.hoverBorder,
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Ambient Orb */}
      <div className={clsx("absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl transition-all", v.orb)}></div>
      
      {/* Top Header Section */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <p className="text-[11px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-1">
            {label}
          </p>
          <h4 className="text-3xl font-black text-surface-900 dark:text-white tracking-tighter font-sans">
            {value}
          </h4>
        </div>
        <div
          className={clsx(
            "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105",
            v.iconBg,
            v.iconBorder,
            v.iconColor,
            v.iconShadow
          )}
        >
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
      </div>

      {/* Middle Trend Section */}
      {trend ? (
        <div className="flex items-center gap-2 text-xs relative z-10">
          <span
            className={clsx(
              "flex items-center font-bold px-1.5 py-0.5 rounded",
              trend.isNeutral ? "text-surface-600 bg-surface-200 dark:text-surface-400 dark:bg-white/5" :
              trend.isPositive ? "text-primary-600 bg-primary-50 dark:text-emerald-400 dark:bg-emerald-500/10" : "text-danger-600 bg-danger-50 dark:text-rose-400 dark:bg-rose-500/10"
            )}
          >
            {trend.isPositive && !trend.isNeutral && (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 10l7-7m0 0l7 7m-7-7v18" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path></svg>
            )}
            {!trend.isPositive && !trend.isNeutral && (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path></svg>
            )}
            {trend.value}
          </span>
          <span className="text-surface-500 dark:text-surface-400">{trend.label}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs relative z-10 opacity-0 select-none">
          {/* Spacer if no trend to keep heights consistent */}
          <span className="flex items-center font-bold px-1.5 py-0.5 rounded">0</span>
        </div>
      )}

      {/* Bottom Sub-label Section */}
      {(subLabel || subValue) && (
        <div className="mt-4 pt-4 border-t border-surface-200 dark:border-white/5 flex items-center justify-between text-xs font-mono relative z-10">
          <span className="text-surface-500 dark:text-surface-400">{subLabel}</span>
          <span className={clsx("font-bold", v.subValueText)}>{subValue}</span>
        </div>
      )}
    </div>
  );
}
