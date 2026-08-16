import React from "react";
import { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

export interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  variant?: "success" | "warning" | "danger" | "info" | "primary" | "default";
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

const VARIANT_MAP = {
  success: {
    iconBg: "bg-success-500/10",
    iconColor: "text-success-400",
    ring: "ring-1 ring-success-500/20",
    glow: "hover:shadow-success-500/10",
  },
  warning: {
    iconBg: "bg-warning-500/10",
    iconColor: "text-warning-400",
    ring: "ring-1 ring-warning-500/20",
    glow: "hover:shadow-warning-500/10",
  },
  danger: {
    iconBg: "bg-danger-500/10",
    iconColor: "text-danger-400",
    ring: "ring-1 ring-danger-500/20",
    glow: "hover:shadow-danger-500/10",
  },
  info: {
    iconBg: "bg-info-500/10",
    iconColor: "text-info-400",
    ring: "ring-1 ring-info-500/20",
    glow: "hover:shadow-info-500/10",
  },
  primary: {
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    ring: "ring-1 ring-emerald-500/20",
    glow: "hover:shadow-emerald-500/10",
  },
  default: {
    iconBg: "bg-white/5",
    iconColor: "text-slate-300",
    ring: "ring-1 ring-white/10",
    glow: "hover:shadow-white/5",
  },
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  variant = "primary",
  trend,
  onClick,
  className,
}: StatCardProps) {
  const v = VARIANT_MAP[variant] || VARIANT_MAP.primary;

  const content = (
    <div
      className={clsx(
        "card-surface-interactive p-5 relative overflow-hidden flex flex-col justify-between group",
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Glow highlight top accent */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {value}
            </span>
            {trend && (
              <span
                className={clsx(
                  "text-xs font-medium px-1.5 py-0.5 rounded-md",
                  trend.isPositive
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-rose-400 bg-rose-500/10"
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
        </div>

        <div
          className={clsx(
            "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
            v.iconBg,
            v.iconColor,
            v.ring
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {sub && (
        <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1.5">
          {sub}
        </p>
      )}
    </div>
  );

  return content;
}
