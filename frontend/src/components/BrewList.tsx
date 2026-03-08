import Link from "next/link";
import { BrewCard } from "./BrewCard";

interface Brew {
  id: number;
  name: string;
  method: string;
  rating: number;
  timeAgo: string;
  icon: string;
}

interface BrewListProps {
  brews: Brew[];
}

export function BrewList({ brews }: BrewListProps) {
  return (
    <section className="px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-100">Recent Brews</h3>
        <Link href="/history" className="text-primary text-sm font-semibold hover:opacity-80 transition-opacity">
          View All
        </Link>
      </div>
      {brews.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl bg-primary/5 border border-white/5 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-600">coffee</span>
          <p className="text-sm text-slate-500">No brews logged yet. Start your first brew!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {brews.map((brew) => (
            <BrewCard
              key={brew.id}
              name={brew.name}
              method={brew.method}
              rating={brew.rating}
              timeAgo={brew.timeAgo}
              icon={brew.icon}
            />
          ))}
        </div>
      )}
    </section>
  );
}
