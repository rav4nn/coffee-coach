"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { GreetingSection } from "@/components/GreetingSection";
import { QuickActions } from "@/components/QuickActions";
import { CoachTip } from "@/components/CoachTip";
import { BrewEditSheet } from "@/components/BrewEditSheet";
import { BrewRatingSheet } from "@/components/BrewRatingSheet";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";
import { useBeansStore } from "@/lib/beansStore";

function methodLabel(methodId: string | null | undefined) {
  if (!methodId) return "Unknown Method";
  return methodId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function methodIcon(methodId: string | null | undefined) {
  if (!methodId) return "coffee";
  if (methodId.includes("cold_brew")) return "water_drop";
  if (methodId.includes("aeropress")) return "import_export";
  if (methodId.includes("french_press")) return "local_cafe";
  return "coffee";
}

function ratio(coffeeGrams: number, waterMl: number) {
  if (!coffeeGrams) return "";
  return `1:${Math.round(waterMl / coffeeGrams)} Ratio`;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}


export default function Home() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "Brewer";

  const entries = useBrewHistoryStore((state) => state.entries);
  const fetchEntries = useBrewHistoryStore((state) => state.fetchEntries);
  const beans = useBeansStore((state) => state.userBeans);
  const fetchBeans = useBeansStore((state) => state.fetchBeans);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editBrewId, setEditBrewId] = useState<string | null>(null);
  const [ratingBrewId, setRatingBrewId] = useState<string | null>(null);

  useEffect(() => {
    void fetchEntries();
    void fetchBeans();
  }, [fetchEntries, fetchBeans]);

  const recentFirst = useMemo(
    () => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries],
  );

  const recentTwo = recentFirst.slice(0, 2);


  const editEntry = editBrewId ? entries.find((e) => e.id === editBrewId) ?? null : null;
  const ratingEntry = ratingBrewId ? entries.find((e) => e.id === ratingBrewId) : null;

  return (
    <main className="overflow-y-auto pb-28">
      <GreetingSection greetingLabel="Hello" userName={`Brewmaster ${firstName}`} />
      <QuickActions />

      <section className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-100">Recent Brews</h3>
          <Link href="/history" className="text-primary text-sm font-semibold hover:opacity-80 transition-opacity">
            View All
          </Link>
        </div>

        {recentTwo.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl bg-primary/5 border border-white/5 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-600">coffee</span>
            <p className="text-sm text-slate-500">No brews logged yet. Start your first brew!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTwo.map((entry) => {
              const beanName = beans.find((b) => b.id === entry.beanId)?.beanName ?? "Unknown Bean";
              const isOpen = expandedId === entry.id;
              const icon = methodIcon(entry.methodId);

              return (
                <article
                  key={entry.id}
                  className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : entry.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <p className="text-sm font-bold text-slate-100 truncate">{beanName}</p>
                        <p className="text-xs text-slate-400 shrink-0">{formatTime(entry.createdAt)}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {methodLabel(entry.methodId)} · {ratio(entry.coffeeGrams, entry.waterMl)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {typeof entry.rating === "number" && (
                          <span className="flex items-center gap-0.5 text-xs text-primary font-semibold">
                            <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>star</span>
                            {entry.rating}/10
                          </span>
                        )}
                        {entry.notes && (
                          <p className="text-xs text-slate-500 italic truncate">{entry.notes}</p>
                        )}
                        {entry.isFavourite && (
                          <span className="material-symbols-outlined text-primary" style={{ fontSize: "13px" }}>favorite</span>
                        )}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-500 text-lg shrink-0">
                      {isOpen ? "expand_less" : "chevron_right"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-primary/15 px-4 py-4 space-y-4">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-primary/10 rounded-xl py-2 px-1">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Extraction</p>
                          <p className="text-sm font-bold text-slate-100 mt-0.5">{entry.brewTime}</p>
                        </div>
                        <div className="bg-primary/10 rounded-xl py-2 px-1">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Grind</p>
                          <p className="text-sm font-bold text-slate-100 mt-0.5">{entry.grindSize}</p>
                        </div>
                        <div className="bg-primary/10 rounded-xl py-2 px-1">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Temp</p>
                          <p className="text-sm font-bold text-slate-100 mt-0.5">
                            {entry.waterTempC ? entry.waterTempC + "°C" : "—"}
                          </p>
                        </div>
                      </div>

                      {entry.notes && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Notes</p>
                          <p className="text-sm text-slate-300 leading-relaxed">{entry.notes}</p>
                        </div>
                      )}

                      {entry.coachingFeedback && (
                        <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-primary/70 font-semibold mb-1">Coach Says</p>
                          <p className="text-sm text-slate-300">{entry.coachingFeedback}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setEditBrewId(entry.id)}
                          className="flex-1 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                          Edit Brew
                        </button>
                        <button
                          onClick={() => setRatingBrewId(entry.id)}
                          className="flex-1 h-10 rounded-xl bg-primary text-background-dark text-sm font-semibold flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">psychology</span>
                          Ask Coach
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <CoachTip />

      <BrewEditSheet
        entry={editEntry}
        open={editBrewId !== null}
        onOpenChange={(o) => { if (!o) setEditBrewId(null); }}
      />

      <BrewRatingSheet
        brewId={ratingBrewId ?? ""}
        open={ratingBrewId !== null}
        onOpenChange={(o) => { if (!o) setRatingBrewId(null); }}
        initialRating={ratingEntry?.rating}
        initialFeedback={ratingEntry?.coachingFeedback}
      />
    </main>
  );
}
