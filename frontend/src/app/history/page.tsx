"use client";

import { useEffect, useMemo, useState } from "react";

import { BrewEditSheet } from "@/components/BrewEditSheet";
import { BrewRatingSheet } from "@/components/BrewRatingSheet";
import { useBeansStore } from "@/lib/beansStore";
import { useBrewHistoryStore, type FreestyleBrewEntry } from "@/lib/brewHistoryStore";

type FilterTab = "all" | "favourites" | "recent";
type ViewMode = "date" | "bean";

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

function RatingSparkline({ ratings }: { ratings: number[] }) {
  if (ratings.length === 0) return null;
  return (
    <div className="flex items-end gap-0.5">
      {ratings.slice(-5).map((r, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-sm ${r >= 8 ? "bg-green-400" : r >= 5 ? "bg-primary" : "bg-red-400"}`}
          style={{ height: `${4 + (r / 10) * 10}px` }}
        />
      ))}
    </div>
  );
}

interface BrewCardProps {
  entry: FreestyleBrewEntry;
  beanName: string;
  beanRatings: number[];
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onCoach: () => void;
}

function BrewCard({ entry, beanName, beanRatings, isOpen, onToggle, onEdit, onCoach }: BrewCardProps) {
  const icon = methodIcon(entry.methodId);
  const chips = entry.tastingNotes ?? [];
  const visibleChips = chips.slice(0, 3);
  const extraChips = chips.length - visibleChips.length;

  return (
    <article className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
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

          {/* Note-first: notes as hero */}
          {entry.notes && (
            <p className="text-xs text-slate-300 italic mt-0.5 truncate">"{entry.notes}"</p>
          )}

          {/* Tasting chips when no notes */}
          {!entry.notes && chips.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {visibleChips.map((c) => (
                <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary/80 font-semibold">{c}</span>
              ))}
              {extraChips > 0 && (
                <span className="text-[10px] text-slate-500">+{extraChips} more</span>
              )}
            </div>
          )}

          {/* Rating + sparkline */}
          <div className="flex items-center gap-2 mt-0.5">
            {typeof entry.rating === "number" && (
              <span className="flex items-center gap-0.5 text-xs text-primary font-semibold">
                <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>star</span>
                {entry.rating}/10
              </span>
            )}
            <RatingSparkline ratings={beanRatings} />
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

          {chips.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Tasting Notes</p>
              <div className="flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <span key={c} className="text-xs px-2.5 py-0.5 rounded-full bg-primary/15 text-primary/80 border border-primary/20 font-semibold">{c}</span>
                ))}
              </div>
            </div>
          )}

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
              onClick={onEdit}
              className="flex-1 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Edit Brew
            </button>
            <button
              onClick={onCoach}
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
}

export default function JournalPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ratingBrewId, setRatingBrewId] = useState<string | null>(null);
  const [editBrewId, setEditBrewId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("date");
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

  // Per-bean rating history (all entries, not just filtered) for sparklines
  const beanRatingsMap = useMemo(() => {
    const map = new Map<string, number[]>();
    const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const e of sorted) {
      if (!e.beanId || typeof e.rating !== "number") continue;
      if (!map.has(e.beanId)) map.set(e.beanId, []);
      map.get(e.beanId)!.push(e.rating);
    }
    return map;
  }, [entries]);

  const dateGroups = useMemo(() => {
    const map = new Map<string, FreestyleBrewEntry[]>();
    for (const entry of filtered) {
      const key = getDateGroup(entry.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const beanGroups = useMemo(() => {
    const map = new Map<string, { beanName: string; entries: FreestyleBrewEntry[] }>();
    for (const e of filtered) {
      const key = e.beanId ?? "unknown";
      const beanName = beans.find((b) => b.id === key)?.beanName ?? "Unknown Bean";
      if (!map.has(key)) map.set(key, { beanName, entries: [] });
      map.get(key)!.entries.push(e);
    }
    return Array.from(map.values()).sort((a, b) => b.entries.length - a.entries.length);
  }, [filtered, beans]);

  const ratingEntry = ratingBrewId ? entries.find((e) => e.id === ratingBrewId) : null;

  function renderCard(entry: FreestyleBrewEntry) {
    const beanName = beans.find((b) => b.id === entry.beanId)?.beanName ?? "Unknown Bean";
    const beanRatings = entry.beanId ? (beanRatingsMap.get(entry.beanId) ?? []) : [];
    return (
      <BrewCard
        key={entry.id}
        entry={entry}
        beanName={beanName}
        beanRatings={beanRatings}
        isOpen={expandedId === entry.id}
        onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
        onEdit={() => setEditBrewId(entry.id)}
        onCoach={() => setRatingBrewId(entry.id)}
      />
    );
  }

  return (
    <section className="pb-28">
      {/* Header */}
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Brew Journal</h1>
        <div className="flex gap-1 rounded-xl bg-primary/10 border border-primary/15 p-0.5">
          <button
            onClick={() => setViewMode("date")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === "date" ? "bg-primary text-background-dark" : "text-primary/70"
            }`}
          >
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            Date
          </button>
          <button
            onClick={() => setViewMode("bean")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === "bean" ? "bg-primary text-background-dark" : "text-primary/70"
            }`}
          >
            <span className="material-symbols-outlined text-sm">nutrition</span>
            Bean
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 border-b border-white/10 mb-3">
        {(["all", "favourites", "recent"] as FilterTab[]).map((tab) => {
          const labels: Record<FilterTab, string> = { all: "All", favourites: "Favorites", recent: "Recent" };
          const active = filterTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                active ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Search */}
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

      {/* Content */}
      {loading && filtered.length === 0 ? (
        <p className="px-4 text-sm text-slate-500 py-8 text-center">Loading brews…</p>
      ) : filtered.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-600">menu_book</span>
          <p className="mt-2 text-sm text-slate-500">No brews found.</p>
        </div>
      ) : viewMode === "date" ? (
        <div className="px-4 space-y-5">
          {dateGroups.map(([dateLabel, groupEntries]) => (
            <div key={dateLabel}>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">{dateLabel}</p>
              <div className="space-y-2">{groupEntries.map(renderCard)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {beanGroups.map(({ beanName, entries: beanEntries }) => {
            const ratings = beanEntries.flatMap((e) => (typeof e.rating === "number" ? [e.rating] : []));
            const avgRating = ratings.length > 0
              ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
              : null;
            return (
              <div key={beanName}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-100">{beanName}</p>
                    <p className="text-xs text-slate-500">
                      {beanEntries.length} brew{beanEntries.length !== 1 ? "s" : ""}
                      {avgRating ? ` · avg ${avgRating}/10` : ""}
                    </p>
                  </div>
                  {ratings.length > 1 && <RatingSparkline ratings={ratings} />}
                </div>
                <div className="space-y-2">{beanEntries.map(renderCard)}</div>
              </div>
            );
          })}
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
        onOpenChange={(o) => { if (!o) setRatingBrewId(null); }}
        initialRating={ratingEntry?.rating}
        initialFeedback={ratingEntry?.coachingFeedback}
        initialTastingNotes={ratingEntry?.tastingNotes}
      />
    </section>
  );
}
