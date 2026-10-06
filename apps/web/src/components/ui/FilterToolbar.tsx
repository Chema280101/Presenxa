"use client";

import React from "react";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { CustomSelect } from "@/components/ui/CustomSelect";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDefinition {
  id: string;
  icon?: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  className?: string;
}

export interface FilterToolbarProps {
  // Search
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: () => void;
  searchPlaceholder?: string;

  // Filters
  filters?: FilterDefinition[];
  customFilters?: React.ReactNode;
  viewModeToggle?: React.ReactNode;

  // Actions
  onReset?: () => void;
}

export function FilterToolbar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = "Buscar...",
  filters = [],
  customFilters,
  viewModeToggle,
  onReset,
}: FilterToolbarProps) {
  return (
    <section className="rounded-2xl p-2.5 sm:p-3 border border-surface-200 dark:border-surface-800 shadow-sm bg-white dark:bg-surface-900 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">

        {/* Left Side: Search & Dynamic Select Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0 w-full lg:w-auto">
          {/* Search Input */}
          {onSearchChange && (
            <div className="relative w-full sm:w-auto sm:min-w-[220px] flex-1 sm:max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400 dark:text-surface-500 z-10">
                <Search className="w-4 h-4" />
              </div>
              <input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && onSearchSubmit) {
                    onSearchSubmit();
                  }
                }}
                className="w-full h-10 pl-9 pr-4 text-xs placeholder:text-surface-400 dark:placeholder:text-surface-500 font-medium input-standard rounded-xl"
                placeholder={searchPlaceholder}
                type="text"
              />
            </div>
          )}

          {/* Select Filters */}
          {filters.map((filter) => {
            const FilterIcon = filter.icon || Filter;
            return (
              <div
                key={filter.id}
                className={clsx(
                  "w-full sm:w-auto sm:min-w-[160px] flex-1 sm:flex-initial",
                  filter.className
                )}
              >
                <CustomSelect
                  value={filter.value}
                  onChange={filter.onChange}
                  options={filter.options}
                  placeholder={filter.placeholder}
                  hasLeftIcon={Boolean(filter.icon)}
                  leftIcon={FilterIcon}
                  className="h-10 text-xs w-full"
                />
              </div>
            );
          })}
        </div>

        {/* Right Side: Custom Filters, View Toggle & Reset Action */}
        {(customFilters || viewModeToggle || onReset) && (
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end shrink-0 pt-1 lg:pt-0 border-t lg:border-0 border-surface-200/60 dark:border-surface-800/60">
            {customFilters}
            {viewModeToggle}

            {onReset && (
              <button
                onClick={onReset}
                className="h-10 px-3.5 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Restablecer filtros"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
