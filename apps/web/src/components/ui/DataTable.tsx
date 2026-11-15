import React from "react";
import { Inbox } from "lucide-react";
import { clsx } from "clsx";

export function DataTableContainer({
  children,
  mobileContent,
  footer,
  ariaLabel = "Tabla de datos",
  className,
}: {
  children: React.ReactNode;
  mobileContent?: React.ReactNode;
  footer?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <section
      aria-label={ariaLabel}
      className={clsx("rounded-2xl border border-surface-200 dark:border-surface-800 shadow-xl overflow-hidden flex flex-col bg-surface-50 dark:bg-surface-950", className)}
    >
      {mobileContent ? (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {children}
            </table>
          </div>
          <div className="md:hidden p-3 space-y-3">
            {mobileContent}
          </div>
        </>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {children}
          </table>
        </div>
      )}
      {footer}
    </section>
  );
}

export function DataTableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-100/50 dark:bg-surface-900/80 text-surface-500 dark:text-surface-400 font-bold uppercase tracking-wider text-[10px]">
        {children}
      </tr>
    </thead>
  );
}

export function DataTableHead({
  children,
  className,
  align = "left",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <th
      className={clsx("py-3.5 px-4", {
        "text-left": align === "left",
        "text-center": align === "center",
        "text-right": align === "right",
      }, className)}
      scope="col"
    >
      {children}
    </th>
  );
}

export function DataTableBody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-surface-200 dark:divide-surface-800/70 font-medium text-surface-700 dark:text-surface-300">
      {children}
    </tbody>
  );
}

export function DataTableRow({
  children,
  className,
  onClick,
  isSelected,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent<HTMLTableRowElement>) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;

  return (
    <tr
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      className={clsx(
        "transition-colors group",
        onClick &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500",
        isSelected
          ? "bg-primary-50 dark:bg-primary-950/20 shadow-[inset_3px_0_0_0_var(--color-primary-500)]"
          : "hover:bg-surface-100 dark:hover:bg-surface-800/40",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function DataTableCell({
  children,
  className,
  align = "left",
  colSpan,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
  colSpan?: number;
  onClick?: (e: React.MouseEvent<HTMLTableCellElement>) => void;
}) {
  return (
    <td
      colSpan={colSpan}
      onClick={onClick}
      className={clsx("py-3.5 px-4", {
        "text-left": align === "left",
        "text-center": align === "center",
        "text-right": align === "right",
      }, className)}
    >
      {children}
    </td>
  );
}

export function DataTableEmptyState({
  colSpan,
  message = "No se encontraron resultados",
  description,
  icon: Icon = Inbox,
  action,
  children,
}: {
  colSpan: number;
  message?: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center text-surface-500 dark:text-surface-400">
        {children ?? (
          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
            <div
              aria-hidden="true"
              className="w-12 h-12 rounded-2xl bg-surface-100 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700/70 flex items-center justify-center mb-3 text-surface-400 dark:text-surface-500"
            >
              <Icon className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">
              {message}
            </p>
            {description && (
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 leading-relaxed">
                {description}
              </p>
            )}
            {action && <div className="mt-4">{action}</div>}
          </div>
        )}
      </td>
    </tr>
  );
}

export function DataTableCheckbox({
  checked = false,
  indeterminate = false,
  onChange,
  disabled = false,
  ariaLabel = "Seleccionar fila",
  className,
}: {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      className={clsx(
        "inline-flex items-center justify-center min-w-7 min-h-7 p-1.5 rounded-lg",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
        className="w-4 h-4 rounded-md border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 text-primary-600 accent-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-0 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </label>
  );
}

export { DataTablePagination } from "./DataTablePagination";


