"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { clsx } from "clsx";
import { ActionButton } from "./ActionButton";

export interface RowActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger" | "warning";
  disabled?: boolean;
  divider?: boolean;
}

export interface RowActionMenuProps {
  items: RowActionMenuItem[];
  title?: string;
  buttonSize?: "sm" | "md";
}

export function RowActionMenu({
  items,
  title = "Más opciones",
  buttonSize = "sm",
}: RowActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculateCoords = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 220;
    const estimatedHeight = items.length * 38 + 16;

    // Check if it should open upwards
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldOpenUpwards = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

    const top = shouldOpenUpwards 
      ? rect.top - estimatedHeight - 4 + window.scrollY 
      : rect.bottom + 6 + window.scrollY;

    const left = Math.max(12, rect.right - menuWidth + window.scrollX);

    setCoords({ top, left });
  }, [items.length]);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      calculateCoords();
    }
    setIsOpen(!isOpen);
  };

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current && 
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  const menuContent = isOpen && mounted ? (
    createPortal(
      <div
        ref={menuRef}
        role="menu"
        aria-orientation="vertical"
        style={{
          position: "absolute",
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          zIndex: 9999,
        }}
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          "w-56 p-1.5 rounded-2xl shadow-2xl border",
          "bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl",
          "border-surface-200 dark:border-surface-700/80",
          "animate-in fade-in-0 zoom-in-95 duration-150 ease-out",
          "text-xs font-medium"
        )}
      >
        <div className="space-y-0.5">
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              {item.divider && (
                <div className="my-1 border-t border-surface-100 dark:border-surface-800/80" />
              )}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  item.onClick();
                }}
                className={clsx(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer select-none",
                  item.variant === "danger"
                    ? "text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-500/15"
                    : item.variant === "warning"
                    ? "text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/15"
                    : "text-surface-700 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:text-primary-700 dark:hover:text-primary-300",
                  item.disabled && "opacity-40 cursor-not-allowed pointer-events-none"
                )}
              >
                {item.icon && (
                  <span className="shrink-0 w-4 h-4 flex items-center justify-center">
                    {item.icon}
                  </span>
                )}
                <span className="truncate">{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>,
      document.body
    )
  ) : null;

  return (
    <>
      <ActionButton
        ref={buttonRef}
        size={buttonSize}
        variant={isOpen ? "primary" : "neutral"}
        icon={<MoreVertical className="w-3.5 h-3.5" />}
        title={title}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={toggleOpen}
      />
      {menuContent}
    </>
  );
}
