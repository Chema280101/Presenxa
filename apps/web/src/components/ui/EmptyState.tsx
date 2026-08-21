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
        "card-surface p-10 sm:p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6 border-dashed border-primary-400/25 relative overflow-hidden",
        className
      )}
    >
      {/* Background ambient subtle glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-primary-400/5 rounded-full blur-2xl pointer-events-none" />

      <div className="w-14 h-14 rounded-3xl bg-primary-400/10 border border-primary-400/20 flex items-center justify-center mb-4 text-primary-300 shadow-inner relative z-10">
        <Icon className="w-7 h-7" />
      </div>

      <h4 className="text-base font-bold text-white mb-1.5 relative z-10">{title}</h4>
      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6 max-w-xs relative z-10">
        {description}
      </p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="gradient-brand px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-surface-950 shadow-lg shadow-primary-950/40 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 relative z-10 cursor-pointer"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
