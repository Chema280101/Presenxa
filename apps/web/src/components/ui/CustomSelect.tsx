"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, Check, Search, X, LucideIcon } from "lucide-react";
import { clsx } from "clsx";

export interface CustomSelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  icon?: LucideIcon | React.ElementType;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownClassName?: string;
  id?: string;
  name?: string;
  hasLeftIcon?: boolean;
  leftIcon?: LucideIcon | React.ElementType;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  disabled = false,
  className,
  dropdownClassName,
  id,
  name,
  hasLeftIcon = false,
  leftIcon: LeftIcon,
  searchable = false,
  searchPlaceholder = "Buscar...",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(term);
      const matchDesc = opt.description ? opt.description.toLowerCase().includes(term) : false;
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(term) : false;
      return matchLabel || matchDesc || matchBadge;
    });
  }, [options, searchable, searchTerm]);

  // Reset search term when opening or closing
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      // Focus search input on next frame
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (!isOpen) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          setIsOpen(true);
          const currentIndex = filteredOptions.findIndex((opt) => opt.value === value);
          setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
        return;
      }

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          break;
        case "Tab":
          setIsOpen(false);
          break;
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
            return next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
            return next;
          });
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            const opt = filteredOptions[highlightedIndex];
            if (!opt.disabled) {
              onChange(opt.value);
              setIsOpen(false);
            }
          }
          break;
        case " ":
          // Don't select on space if the user is typing in the search input
          if (e.target === searchInputRef.current) {
            return;
          }
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            const opt = filteredOptions[highlightedIndex];
            if (!opt.disabled) {
              onChange(opt.value);
              setIsOpen(false);
            }
          }
          break;
      }
    },
    [isOpen, disabled, highlightedIndex, filteredOptions, value, onChange]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const items = listboxRef.current.querySelectorAll("[role='option']");
      const targetItem = items[highlightedIndex] as HTMLElement;
      if (targetItem) {
        targetItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const showLeftPadding = hasLeftIcon || !!LeftIcon;

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input to keep standard form data compatible */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Select Trigger */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={clsx(
          "w-full h-11 text-sm text-left flex items-center justify-between gap-2.5",
          "rounded-xl font-medium border shadow-xs outline-none transition-all cursor-pointer select-none",
          "bg-white dark:bg-white/[0.05] dark:hover:bg-white/[0.08]",
          "text-surface-900 dark:text-white",
          "border-surface-200 dark:border-white/10 dark:hover:border-white/20",
          "focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20",
          isOpen && "border-primary-500 dark:border-primary-400 ring-2 ring-primary-500/20 dark:ring-primary-400/20",
          disabled && "opacity-50 cursor-not-allowed",
          showLeftPadding ? "pl-10 pr-3.5" : "px-3.5",
          className
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {LeftIcon && (
            <LeftIcon className="w-4 h-4 text-surface-400 dark:text-surface-400 flex-shrink-0" />
          )}
          <span
            className={clsx(
              "truncate font-medium block",
              !selectedOption ? "text-surface-400 dark:text-surface-500" : "text-surface-900 dark:text-white"
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={clsx(
            "w-4 h-4 text-surface-400 dark:text-surface-400 transition-transform duration-200 flex-shrink-0",
            isOpen && "rotate-180 text-primary-500 dark:text-primary-400"
          )}
        />
      </button>

      {/* Custom Dropdown Panel */}
      {isOpen && (
        <div
          ref={listboxRef}
          role="listbox"
          className={clsx(
            "absolute left-0 right-0 top-full mt-1.5 z-50",
            "bg-white dark:bg-[#0c1424]",
            "border border-surface-200 dark:border-white/15",
            "rounded-2xl shadow-xl shadow-surface-950/15 dark:shadow-black/70",
            "p-1.5 overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 duration-150 origin-top",
            dropdownClassName
          )}
        >
          {/* Predictive Search Input */}
          {searchable && (
            <div className="p-1 pb-1.5 border-b border-surface-200/80 dark:border-white/10 mb-1">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-surface-400 dark:text-surface-500 pointer-events-none shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full h-8 pl-8 pr-7 text-xs rounded-xl bg-surface-50 dark:bg-white/[0.06] border border-surface-200 dark:border-white/10 text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500 outline-none focus:border-primary-500 dark:focus:border-primary-400 focus:ring-1 focus:ring-primary-500/20 transition-all font-medium"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm("");
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 p-0.5 rounded-full hover:bg-surface-200 dark:hover:bg-white/10 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-xs text-center text-surface-400 dark:text-surface-500 font-normal">
                {searchTerm ? "No se encontraron resultados" : "No hay opciones disponibles"}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;
                const OptionIcon = option.icon;

                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      if (!option.disabled) {
                        onChange(option.value);
                        setIsOpen(false);
                      }
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={clsx(
                      "w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none",
                      option.disabled && "opacity-40 cursor-not-allowed",
                      isSelected
                        ? "bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-300 font-semibold"
                        : isHighlighted
                          ? "bg-surface-100 dark:bg-white/10 text-surface-900 dark:text-white"
                          : "text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {OptionIcon && (
                        <OptionIcon
                          className={clsx(
                            "w-4 h-4 flex-shrink-0",
                            isSelected
                              ? "text-primary-500"
                              : "text-surface-400 dark:text-surface-500"
                          )}
                        />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{option.label}</span>
                        {option.description && (
                          <span
                            className={clsx(
                              "text-[11px] font-normal truncate mt-0.5",
                              isSelected
                                ? "text-primary-600/80 dark:text-primary-400/80"
                                : "text-surface-500 dark:text-surface-400"
                            )}
                          >
                            {option.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {option.badge && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 flex-shrink-0">
                        {option.badge}
                      </span>
                    )}

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary-500/15 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
