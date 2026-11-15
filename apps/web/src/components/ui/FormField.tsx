"use client";

import React, { useId } from "react";
import { clsx } from "clsx";
import { AlertCircle } from "lucide-react";

export const formInputBaseClass =
  "w-full h-11 text-sm bg-white dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500 font-medium rounded-xl border border-surface-200 dark:border-white/10 dark:hover:border-white/20 shadow-xs focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed";

export const formInputErrorClass =
  "border-danger-500 dark:border-danger-400 focus:border-danger-500 dark:focus:border-danger-400 focus:ring-danger-500/20 dark:focus:ring-danger-400/20";

export function getFormInputClass({
  hasLeftIcon = false,
  hasRightElement = false,
  hasError = false,
  className,
}: {
  hasLeftIcon?: boolean;
  hasRightElement?: boolean;
  hasError?: boolean;
  className?: string;
}) {
  return clsx(
    formInputBaseClass,
    hasLeftIcon ? "pl-10" : "pl-4",
    hasRightElement ? "pr-11" : "pr-4",
    hasError && formInputErrorClass,
    className
  );
}

export const formTextareaBaseClass =
  "w-full text-sm bg-white dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500 font-medium rounded-xl border border-surface-200 dark:border-white/10 dark:hover:border-white/20 shadow-xs focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 outline-none transition-all px-4 py-3 resize-none disabled:opacity-50 disabled:cursor-not-allowed";

export interface FormFieldRenderProps {
  id: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  icon?: React.ElementType;
  required?: boolean;
  optional?: boolean;
  helperText?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode | ((props: FormFieldRenderProps) => React.ReactNode);
}

/**
 * Accessible form field wrapper that automatically wires `label[htmlFor]`,
 * `aria-invalid`, and `aria-describedby` for inline helper text and errors.
 */
export function FormField({
  label,
  htmlFor,
  icon: Icon,
  required = false,
  optional = false,
  helperText,
  error,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = htmlFor || generatedId;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;

  const describedByParts: string[] = [];
  if (error) describedByParts.push(errorId);
  if (helperText) describedByParts.push(helperId);
  const describedBy = describedByParts.length > 0 ? describedByParts.join(" ") : undefined;

  const renderContent = () => {
    if (typeof children === "function") {
      return children({
        id: fieldId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      });
    }

    if (React.isValidElement<Record<string, unknown>>(children)) {
      const existingId = children.props.id as string | undefined;
      return React.cloneElement(children, {
        id: existingId || fieldId,
        "aria-invalid": error ? true : children.props["aria-invalid"],
        "aria-describedby": describedBy || children.props["aria-describedby"],
      });
    }

    return children;
  };

  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={fieldId}
          className="text-xs font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-1 cursor-pointer"
        >
          <span>{label}</span>
          {required && (
            <span className="text-danger-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {optional && (
          <span className="text-[10px] text-surface-400 dark:text-surface-500 font-normal">
            (Opcional)
          </span>
        )}
      </div>

      <div className="relative group">
        {Icon && (
          <div className="absolute top-0 left-0 h-11 pl-3.5 flex items-center pointer-events-none text-surface-400 group-focus-within:text-primary-500 transition-colors z-10">
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
        {renderContent()}
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-danger-600 dark:text-danger-400 flex items-center gap-1.5 mt-0.5"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {helperText && (
        <div
          id={helperId}
          className="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5 leading-tight"
        >
          {helperText}
        </div>
      )}
    </div>
  );
}
