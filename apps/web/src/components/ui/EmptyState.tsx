import React from "react";
import { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const ActionIcon = action?.icon;

  return (
    <div
      className={clsx(
        "card-surface p-10 sm:p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6 border-dashed border-emerald-500/20",
        className
      )}
    >
      <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400 shadow-inner">
        <Icon className="w-7 h-7" />
      </div>

      <h4 className="text-base font-bold text-white mb-1.5">{title}</h4>
      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6 max-w-xs">
        {description}
      </p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="gradient-brand px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
