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
  primary: {
    iconBg: "bg-primary-400/15",
    iconColor: "text-primary-300",
    ring: "ring-1 ring-primary-400/30",
    glowBorder: "via-primary-400/40",
  },
  success: {
    iconBg: "bg-lime-400/15",
    iconColor: "text-lime-300",
    ring: "ring-1 ring-lime-400/30",
    glowBorder: "via-lime-400/40",
  },
  warning: {
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-300",
    ring: "ring-1 ring-amber-500/30",
    glowBorder: "via-amber-400/40",
  },
  danger: {
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-300",
    ring: "ring-1 ring-rose-500/30",
    glowBorder: "via-rose-400/40",
  },
  info: {
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-300",
    ring: "ring-1 ring-sky-500/30",
    glowBorder: "via-sky-400/40",
  },
  default: {
    iconBg: "bg-white/10",
    iconColor: "text-slate-200",
    ring: "ring-1 ring-white/15",
    glowBorder: "via-white/20",
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

  return (
    <div
      onClick={onClick}
      className={clsx(
        "card-surface-interactive p-5 relative overflow-hidden flex flex-col justify-between group",
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Dynamic top highlight border glow */}
      <div
        className={clsx(
          "absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          v.glowBorder
        )}
      />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-1">
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
                  "text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1",
                  trend.isPositive
                    ? "text-lime-300 bg-lime-400/15 ring-lime-400/30"
                    : "text-rose-300 bg-rose-500/15 ring-rose-500/30"
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
        </div>

        <div
          className={clsx(
            "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-inner",
            v.iconBg,
            v.iconColor,
            v.ring
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {sub && (
        <p className="text-xs text-slate-400 font-medium truncate flex items-center gap-1.5 pt-1 border-t border-white/5">
          {sub}
        </p>
      )}
    </div>
  );
}
