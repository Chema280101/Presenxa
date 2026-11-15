import { Skeleton } from "@/components/ui/Skeleton";

export default function EmployeePortalLoading() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-command-bg flex flex-col">
      <div className="border-b border-surface-200 dark:border-white/10 px-4 lg:px-8 py-3 bg-white/90 dark:bg-command-bg/85">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="hidden sm:block space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="w-36 h-11 rounded-xl" />
            <Skeleton className="w-11 h-11 rounded-xl" />
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-200/60 dark:border-white/5">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="h-11 w-64 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 xl:col-span-5 space-y-5">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-[460px] w-full rounded-3xl" />
          </div>
          <div className="lg:col-span-6 xl:col-span-7 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
