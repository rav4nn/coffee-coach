import { Skeleton } from "@/components/Skeleton";

function RecipeCardSkeleton() {
  return (
    <div className="rounded-xl border border-primary/10 bg-background-dark p-4 animate-pulse">
      <div className="space-y-3 pr-10">
        <Skeleton className="h-6 w-3/4" />
        <div className="grid grid-cols-2 gap-y-2 pt-2 border-t border-primary/10">
          {[
            ["scale", "w-20"],
            ["water_drop", "w-24"],
            ["thermostat", "w-16"],
            ["timer", "w-20"],
          ].map(([icon, width], i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary/20 text-sm">{icon}</span>
              <Skeleton className={`h-3 ${width} bg-primary/10`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GuidedRecipesLoading() {
  return (
    <>
      {/* Sticky header skeleton */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-background-dark/80 backdrop-blur-md z-10 border-b border-primary/10">
        <div className="size-10 rounded-full bg-primary/10 animate-pulse" />
        <div className="flex flex-col items-center gap-1.5">
          <Skeleton className="h-2 w-20" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="size-10" />
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        <div className="px-4 py-6 space-y-4">
          <RecipeCardSkeleton />
          <RecipeCardSkeleton />
          <RecipeCardSkeleton />
          <RecipeCardSkeleton />
        </div>
      </main>

      {/* Start brew button */}
      <div className="fixed bottom-[72px] left-0 w-full px-4 pb-4 pt-8">
        <div className="w-full h-14 rounded-xl bg-primary/20 animate-pulse" />
      </div>
    </>
  );
}
