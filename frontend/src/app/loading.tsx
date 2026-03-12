import { Skeleton } from "@/components/Skeleton";

function BrewCardSkeleton() {
  return (
    <div className="rounded-2xl border border-primary/10 bg-primary/5 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Method icon placeholder */}
        <div className="w-12 h-12 rounded-xl bg-primary/10 animate-pulse shrink-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary/20 text-xl">coffee</span>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex justify-between gap-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-20" />
        </div>
        <span className="material-symbols-outlined text-primary/10 text-lg shrink-0">chevron_right</span>
      </div>
    </div>
  );
}

export default function HomeLoading() {
  return (
    <main className="overflow-y-auto pb-28">
      {/* Greeting section */}
      <div className="px-4 pt-6 pb-4 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-48" />
      </div>

      {/* Quick actions */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-3">
        <div className="h-16 rounded-2xl bg-primary/5 border border-primary/10 animate-pulse flex items-center justify-center gap-2 px-4">
          <span className="material-symbols-outlined text-primary/20">add_circle</span>
          <Skeleton className="h-3 w-16 bg-primary/15" />
        </div>
        <div className="h-16 rounded-2xl bg-primary/5 border border-primary/10 animate-pulse flex items-center justify-center gap-2 px-4">
          <span className="material-symbols-outlined text-primary/20">history</span>
          <Skeleton className="h-3 w-16 bg-primary/15" />
        </div>
      </div>

      {/* Recent Brews */}
      <section className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="space-y-2">
          <BrewCardSkeleton />
          <BrewCardSkeleton />
        </div>
      </section>

      {/* Coach tip */}
      <section className="px-4 py-4">
        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 space-y-2 animate-pulse">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary/20 text-sm">psychology</span>
            <Skeleton className="h-2.5 w-20 bg-primary/15" />
          </div>
          <Skeleton className="h-3 w-full bg-primary/10" />
          <Skeleton className="h-3 w-4/5 bg-primary/10" />
          <Skeleton className="h-3 w-3/5 bg-primary/10" />
        </div>
      </section>
    </main>
  );
}
