import React from "react";
import { clsx } from "clsx";

export function DataTableContainer({
  children,
  footer,
  className,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("rounded-2xl border border-surface-200 dark:border-surface-800 shadow-xl overflow-hidden flex flex-col bg-surface-50 dark:bg-surface-950", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          {children}
        </table>
      </div>
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
  return (
    <tr
      onClick={onClick}
      className={clsx(
        "transition group",
        onClick && "cursor-pointer",
        isSelected
          ? "bg-primary-50 dark:bg-primary-950/20 border-l-2 border-l-primary-500"
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
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
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
}: {
  colSpan: number;
  message?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-8 text-center text-surface-500 dark:text-surface-500">
        {message}
      </td>
    </tr>
  );
}
