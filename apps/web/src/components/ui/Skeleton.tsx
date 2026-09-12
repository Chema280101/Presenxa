"use client";

import React from "react";
import { clsx } from "clsx";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "skeleton-shimmer rounded-xl border border-surface-200/60 dark:border-surface-700/40",
        className
      )}
      {...props}
    />
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-white dark:bg-surface-900 p-5 rounded-2xl sm:rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-28 rounded-xl" />
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-3 w-28 rounded-md" />
      </div>
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-surface-200 dark:border-surface-800">
      {Array.from({ length: cols }).map((_, idx) => (
        <td key={idx} className="px-6 py-4">
          <Skeleton className="h-5 w-full max-w-[140px]" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({
  rows = 5,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="w-full bg-white dark:bg-surface-900 rounded-2xl sm:rounded-3xl border border-surface-200 dark:border-surface-800 overflow-hidden shadow-sm">
      <div className="p-4 sm:p-6 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950/50">
              {Array.from({ length: cols }).map((_, idx) => (
                <th key={idx} className="px-6 py-3.5">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, idx) => (
              <SkeletonTableRow key={idx} cols={cols} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
