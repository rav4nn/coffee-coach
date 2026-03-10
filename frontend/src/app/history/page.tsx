"use client";

import { useEffect, useMemo, useState } from "react";

import { BrewEditSheet } from "@/components/BrewEditSheet";
import { BrewRatingSheet } from "@/components/BrewRatingSheet";
import { useBeansStore } from "@/lib/beansStore";
import { useBrewHistoryStore, type FreestyleBrewEntry } from "@/lib/brewHistoryStore";

type FilterTab = "all" | "favourites" | "recent";

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

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getDateGroup(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "TODAY";
  if (date.toDateString() === yesterday.toDateString()) return "YESTERDAY";
  return date
    .toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    .toUpperCase();
}

function ratio(coffeeGrams: number, waterMl: number) {
  if (!coffeeGrams) return "";
  return `1:${Math.round(waterMl / coffeeGrams)} Ratio`;
}

export default function HistoryPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ratingBrewId, setRatingBrewId] = useState<string | null>(null);
  const [editBrewId, setEditBrewId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const entries = useBrewHistoryStore((state) => state.entries);
  const fetchEntries = useBrewHistoryStore((state) => state.fetchEntries);
  const loading = useBrewHistoryStore((state) => state.loading);
  const beans = useBeansStore((state) => state.userBeans);
  const fetchBeans = useBeansStore((state) => state.fetchBeans);

  useEffect(() => {
    void fetchEntries();
    void fetchBeans();
  }, [fetchEntries, fetchBeans]);

  const recentFirst = useMemo(
    () => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries],
  );

  const sevenDaysAgo = useMemo(
    () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    [],
  );

  const filtered = useMemo(() => {
    return recentFirst.filter((entry) => {
      if (filterTab === "favourites" && !entry.isFavourite) return false;
      if (filterTab === "recent" && entry.createdAt < sevenDaysAgo) return false;
      if (search) {
        const beanName = beans.find((b) => b.id === entry.beanId)?.beanName ?? "";
        const method = methodLabel(entry.methodId);
        const q = search.toLowerCase();
        if (!beanName.toLowerCase().includes(q) && !method.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [recentFirst, filterTab, search, beans, sevenDaysAgo]);

  const groups = useMemo(() => {
    const map = new Map<string, FreestyleBrewEntry[]>();
    for (const entry of filtered) {
      const key = getDateGroup(entry.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const ratingEntry = ratingBrewId ? entries.find((e) => e.id === ratingBrewId) : null;

  return (
    <section className="pb-28">
      <div className="px-4 pt-2 pb-3">
        <h1 className="text-2xl font-bold text-slate-100">Brew History</h1>
      </div>

      <div className="flex gap-1 px-4 border-b border-white/10 mb-3">
        {(["all", "favourites", "recent"] as FilterTab[]).map((tab) => {
          const labels: Record<FilterTab, string> = {
            all: "All",
            favourites: "Favorites",
            recent: "Recent",
          };
          const active = filterTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      <div className="px-4 mb-4">
        <div className="flex items-center gap-3 h-11 rounded-xl bg-primary/10 px-4">
          <span className="material-symbols-outlined text-primary/50 text-xl">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search past brews..."
            className="flex-1 bg-transparent text-slate-100 placeholder:text-slate-500 text-sm outline-none"
          />
        </div>
      </div>

      {loading && filtered.length === 0 ? (
        <p className="px-4 text-sm text-slate-500 py-8 text-center">Loading brews…</p>
      ) : filtered.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-600">coffee</span>
          <p className="mt-2 text-sm text-slate-500">No brews found.</p>
        </div>
      ) : (
        <div className="px-4 space-y-5">
          {groups.map(([dateLabel, groupEntries]) => (
            <div key={dateLabel}>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">{dateLabel}</p>
              <div className="space-y-2">
                {groupEntries.map((entry) => {
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
            </div>
          ))}
        </div>
      )}

      <BrewEditSheet
        entry={editBrewId ? entries.find((e) => e.id === editBrewId) ?? null : null}
        open={editBrewId !== null}
        onOpenChange={(o) => { if (!o) setEditBrewId(null); }}
      />

      <BrewRatingSheet
        brewId={ratingBrewId ?? ""}
        open={ratingBrewId !== null}
        onOpenChange={(o) => {
          if (!o) setRatingBrewId(null);
        }}
        initialRating={ratingEntry?.rating}
        initialFeedback={ratingEntry?.coachingFeedback}
      />
    </section>
  );
}
