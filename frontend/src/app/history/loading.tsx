import { Skeleton } from "@/components/Skeleton";

function HistoryCardSkeleton() {
  return (
    <div className="rounded-2xl border border-primary/10 bg-primary/5 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 animate-pulse shrink-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary/20 text-xl">coffee</span>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex justify-between gap-2">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-3 w-16" />
        </div>
        <span className="material-symbols-outlined text-primary/10 text-lg shrink-0">chevron_right</span>
      </div>
    </div>
  );
}

export default function HistoryLoading() {
  return (
    <main className="overflow-y-auto pb-28">
      {/* Header: title + view toggle */}
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <Skeleton className="h-6 w-36" />
        <div className="flex gap-1">
          <div className="h-8 w-20 rounded-full bg-primary/10 animate-pulse" />
          <div className="h-8 w-20 rounded-full bg-primary/10 animate-pulse" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 pb-4">
        {["All", "Favourites", "Recent"].map((label) => (
          <div key={label} className="h-9 px-4 rounded-full bg-primary/10 animate-pulse flex items-center">
            <Skeleton className="h-3 w-12 bg-primary/20" />
          </div>
        ))}
      </div>

      {/* Date group label */}
      <div className="px-4 pb-2">
        <Skeleton className="h-2.5 w-20" />
      </div>

      {/* Cards */}
      <div className="px-4 space-y-2">
        <HistoryCardSkeleton />
        <HistoryCardSkeleton />
        <HistoryCardSkeleton />
      </div>

      {/* Second group */}
      <div className="px-4 pt-5 pb-2">
        <Skeleton className="h-2.5 w-28" />
      </div>
      <div className="px-4 space-y-2">
        <HistoryCardSkeleton />
        <HistoryCardSkeleton />
      </div>
    </main>
  );
}
