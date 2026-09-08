import { Skeleton, SkeletonStatCard } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-2xl" />
          <Skeleton className="h-4 w-48 rounded-xl" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-2xl" />
          <Skeleton className="h-10 w-36 rounded-2xl" />
        </div>
      </div>

      {/* 4 Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Main Grid: Left content + Right sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity & Status summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-surface p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40 rounded-xl" />
              <Skeleton className="h-4 w-24 rounded-xl" />
            </div>
            <Skeleton className="h-4 w-full rounded-full" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          </div>

          {/* Activity Feed Table Skeleton */}
          <div className="card-surface p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-44 rounded-xl" />
              <Skeleton className="h-8 w-28 rounded-xl" />
            </div>
            <div className="space-y-3 pt-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-2xl" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32 rounded-lg" />
                      <Skeleton className="h-3 w-20 rounded-lg" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Top late arrivals & quick actions */}
        <div className="space-y-6">
          <div className="card-surface p-6 rounded-3xl border border-white/10 space-y-4">
            <Skeleton className="h-5 w-36 rounded-xl" />
            <div className="space-y-3 pt-1">
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
            </div>
          </div>

          <div className="card-surface p-6 rounded-3xl border border-white/10 space-y-4">
            <Skeleton className="h-5 w-32 rounded-xl" />
            <div className="space-y-2.5 pt-1">
              <Skeleton className="h-11 rounded-2xl" />
              <Skeleton className="h-11 rounded-2xl" />
              <Skeleton className="h-11 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
