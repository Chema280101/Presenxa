"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { clsx } from "clsx";

export interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  showPageSizeSelector?: boolean;
  className?: string;
}

export function DataTablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = "registros",
  showPageSizeSelector = true,
  className,
}: DataTablePaginationProps) {
  const safePage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Generate intelligent page numbers with ellipsis
  const paginationRange = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    const leftSiblingIndex = Math.max(safePage - 1, 1);
    const rightSiblingIndex = Math.min(safePage + 1, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftRange = [1, 2, 3, 4];
      pages.push(...leftRange, "...", totalPages);
    } else if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightRange = [
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
      pages.push(1, "...", ...rightRange);
    } else if (shouldShowLeftDots && shouldShowRightDots) {
      pages.push(1, "...", leftSiblingIndex, safePage, rightSiblingIndex, "...", totalPages);
    }

    return pages;
  }, [totalPages, safePage]);

  return (
    <div
      className={clsx(
        "px-5 py-3 border-t border-surface-200 dark:border-surface-800/80 bg-surface-50 dark:bg-surface-900/90",
        "flex flex-col lg:flex-row items-center justify-between gap-3 text-xs transition-colors",
        className
      )}
    >
      {/* Left: Summary Counter */}
      <div className="text-surface-600 dark:text-slate-400 flex flex-wrap items-center gap-2">
        <span>
          Mostrando{" "}
          <strong className="text-surface-900 dark:text-slate-200 font-mono font-bold">
            {startItem} - {endItem}
          </strong>{" "}
          de{" "}
          <strong className="text-surface-900 dark:text-slate-200 font-mono font-bold">
            {totalItems}
          </strong>{" "}
          {itemLabel}
        </span>
        <span className="hidden sm:inline text-surface-300 dark:text-surface-700">•</span>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-primary-600 dark:text-primary-400 font-mono text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sincronizado</span>
        </span>
      </div>

      {/* Right: Controls & Page Numbers */}
      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
        {/* Page Size Selector */}
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-surface-600 dark:text-slate-400">
            <span className="text-[11px]">Filas:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Registros por página"
              className={clsx(
                "h-8 px-2 py-0 rounded-lg text-xs font-mono font-medium",
                "bg-white dark:bg-surface-800 text-surface-800 dark:text-slate-200",
                "border border-surface-300 dark:border-surface-700",
                "shadow-2xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none transition cursor-pointer"
              )}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1" role="navigation" aria-label="Paginación de tabla">
          {/* First Page Button */}
          {totalPages > 5 && (
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={safePage <= 1}
              aria-label="Primera página"
              title="Primera página"
              className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer",
                "border border-surface-200 dark:border-surface-700/80 bg-white dark:bg-surface-800",
                "hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-700 dark:text-slate-300",
                "disabled:opacity-35 disabled:cursor-not-allowed disabled:pointer-events-none"
              )}
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Previous Page Button */}
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            aria-label="Página anterior"
            className={clsx(
              "h-8 px-2.5 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs font-medium",
              "border border-surface-200 dark:border-surface-700/80 bg-white dark:bg-surface-800",
              "hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-700 dark:text-slate-300",
              "disabled:opacity-35 disabled:cursor-not-allowed disabled:pointer-events-none"
            )}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Page Number Buttons */}
          <div className="flex items-center gap-1">
            {paginationRange.map((pageNumber, idx) => {
              if (pageNumber === "...") {
                return (
                  <span
                    key={`dots-${idx}`}
                    className="w-7 h-8 flex items-center justify-center text-surface-400 dark:text-slate-500 font-mono text-xs select-none"
                  >
                    •••
                  </span>
                );
              }

              const isCurrent = pageNumber === safePage;

              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => onPageChange(Number(pageNumber))}
                  aria-label={`Página ${pageNumber}`}
                  aria-current={isCurrent ? "page" : undefined}
                  className={clsx(
                    "min-w-8 h-8 px-2 rounded-lg text-xs font-mono font-bold transition cursor-pointer flex items-center justify-center",
                    isCurrent
                      ? "bg-primary-600 text-white shadow-xs border border-primary-600 dark:bg-primary-500 dark:text-slate-950 dark:border-primary-500"
                      : "bg-white hover:bg-surface-100 text-surface-700 border border-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 dark:text-slate-300 dark:border-surface-700/80"
                  )}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>

          {/* Next Page Button */}
          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            aria-label="Página siguiente"
            className={clsx(
              "h-8 px-2.5 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs font-medium",
              "border border-surface-200 dark:border-surface-700/80 bg-white dark:bg-surface-800",
              "hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-700 dark:text-slate-300",
              "disabled:opacity-35 disabled:cursor-not-allowed disabled:pointer-events-none"
            )}
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Page Button */}
          {totalPages > 5 && (
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              disabled={safePage >= totalPages}
              aria-label="Última página"
              title="Última página"
              className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer",
                "border border-surface-200 dark:border-surface-700/80 bg-white dark:bg-surface-800",
                "hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-700 dark:text-slate-300",
                "disabled:opacity-35 disabled:cursor-not-allowed disabled:pointer-events-none"
              )}
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
