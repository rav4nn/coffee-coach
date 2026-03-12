import { Skeleton } from "@/components/Skeleton";

function BeanCardSkeleton() {
  return (
    <article className="flex flex-col gap-3 rounded-xl bg-primary/5 border border-primary/10 p-4 animate-pulse">
      <div className="flex gap-4">
        {/* Bean image placeholder */}
        <div className="w-24 h-24 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-4xl text-primary/20">coffee</span>
        </div>
        <div className="flex flex-col justify-between py-1 flex-1 min-w-0">
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-2">
              <Skeleton className="h-2.5 w-20 bg-primary/15" />
              <Skeleton className="h-4 w-12 rounded-full bg-primary/10" />
            </div>
            <Skeleton className="h-5 w-36 bg-primary/15" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="material-symbols-outlined text-primary/20 text-sm">calendar_today</span>
            <Skeleton className="h-2.5 w-28 bg-primary/10" />
          </div>
        </div>
      </div>
      {/* Action buttons row */}
      <div className="flex gap-2 pt-2 border-t border-primary/10">
        <div className="flex-1 h-9 rounded-lg bg-primary/10" />
        <div className="flex-1 h-9 rounded-lg bg-primary/20" />
      </div>
    </article>
  );
}

export default function MyBeansLoading() {
  return (
    <main className="flex flex-col min-h-full pb-28">
      {/* Search bar */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 h-12 rounded-xl bg-primary/10 animate-pulse px-4">
          <span className="material-symbols-outlined text-primary/20">search</span>
          <Skeleton className="h-3 w-40 bg-primary/20" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-3 px-4 py-2">
        {["All Beans", "Whole Bean", "Ground"].map((label) => (
          <div key={label} className="h-9 px-4 rounded-full bg-primary/10 animate-pulse flex items-center shrink-0">
            <Skeleton className="h-3 w-14 bg-primary/20" />
          </div>
        ))}
      </div>

      {/* Bean cards */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-4">
        <BeanCardSkeleton />
        <BeanCardSkeleton />
        <BeanCardSkeleton />
      </div>
    </main>
  );
}
