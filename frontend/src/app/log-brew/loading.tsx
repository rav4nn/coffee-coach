import { Skeleton } from "@/components/Skeleton";

const METHOD_ICONS = ["water_drop", "compress", "coffee_maker", "soup_kitchen", "ac_unit", "filter_alt"];

export default function LogBrewLoading() {
  return (
    <main className="relative px-6 pb-36 overflow-y-auto">
      {/* Step indicator */}
      <div className="pt-8 pb-4 flex justify-center">
        <div className="flex gap-1">
          <div className="h-1.5 w-12 rounded-full bg-primary animate-pulse" />
          <div className="h-1.5 w-12 rounded-full bg-primary/20" />
        </div>
      </div>

      {/* Title */}
      <Skeleton className="h-8 w-48 mt-4 mb-8" />

      {/* Bean selection */}
      <section className="mb-8">
        <Skeleton className="h-3 w-24 mb-3" />
        <div className="flex items-center justify-between w-full p-4 rounded-xl bg-primary/5 border border-primary/20 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary/30">eco</span>
            <Skeleton className="h-3.5 w-36 bg-primary/15" />
          </div>
          <span className="material-symbols-outlined text-primary/20">expand_more</span>
        </div>
      </section>

      {/* Brew method grid */}
      <section className="mb-8">
        <Skeleton className="h-3 w-24 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {METHOD_ICONS.map((icon, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center py-2 px-3 rounded-xl border-2 border-primary/10 bg-primary/5 animate-pulse"
            >
              <span className="material-symbols-outlined text-2xl mb-1 text-primary/20">{icon}</span>
              <Skeleton className="h-2 w-12 bg-primary/15" />
            </div>
          ))}
        </div>
      </section>

      {/* Next step button */}
      <div className="w-full h-14 rounded-xl bg-primary/20 animate-pulse" />
    </main>
  );
}
