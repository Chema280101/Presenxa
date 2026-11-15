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
    <div className="command-card p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-14 rounded" />
          <Skeleton className="h-3.5 w-24 rounded-md" />
        </div>
      </div>
      <div className="mt-4 pt-3.5 border-t border-surface-200 dark:border-white/5 flex items-center justify-between gap-2">
        <Skeleton className="h-3.5 w-28 rounded-md" />
        <Skeleton className="h-3.5 w-12 rounded-md" />
      </div>
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  const colKeys = Array.from({ length: cols }, (_, idx) => `skel-col-${idx}`);
  return (
    <tr className="border-b border-surface-200 dark:border-surface-800">
      {colKeys.map((colKey) => (
        <td key={colKey} className="px-6 py-4">
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
  const colKeys = Array.from({ length: cols }, (_, idx) => `skel-head-${idx}`);
  const rowKeys = Array.from({ length: rows }, (_, idx) => `skel-row-${idx}`);
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
              {colKeys.map((colKey) => (
                <th key={colKey} className="px-6 py-3.5">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((rowKey) => (
              <SkeletonTableRow key={rowKey} cols={cols} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
