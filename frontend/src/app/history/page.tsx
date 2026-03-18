"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

import { BrewEditSheet } from "@/components/BrewEditSheet";
import { BrewStatsView } from "@/components/BrewStatsView";
import { FilterDropdown, ALL_METHODS, type FilterState, methodLabelFromId } from "@/components/FilterDropdown";
import { BrewShareCard } from "@/components/share/BrewShareCard";
import { useBeansStore } from "@/lib/beansStore";
import { useBrewHistoryStore, type FreestyleBrewEntry } from "@/lib/brewHistoryStore";
import { captureAsBlob, captureStatsAndShare, shareOrDownload, SHARE_CAPTION } from "@/lib/shareUtils";

function methodImage(methodId: string | null | undefined): string {
  if (!methodId) return "/methods/pour_over.png";
  if (methodId.includes("pour_over") || methodId === "v60" || methodId === "chemex" || methodId === "kalita_wave" || methodId === "clever_dripper" || methodId === "hario_switch" || methodId === "wilfa_pour_over" || methodId === "origami_dripper") return "/methods/pour_over.png";
  if (methodId.includes("aeropress")) return "/methods/aeropress.png";
  if (methodId.includes("french_press")) return "/methods/french_press.png";
  if (methodId.includes("moka_pot")) return "/methods/moka_pot.png";
  if (methodId.includes("cold_brew")) return "/methods/cold_brew.png";
  if (methodId.includes("south_indian_filter")) return "/methods/filter.png";
  return "/methods/pour_over.png";
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
  return `1:${Math.round(waterMl / coffeeGrams)}`;
}

interface BrewCardProps {
  entry: FreestyleBrewEntry;
  beanName: string;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onShare: () => void;
}

function BrewCard({ entry, beanName, isOpen, onToggle, onEdit, onShare }: BrewCardProps) {
  const imgSrc = methodImage(entry.methodId);
  const chips = entry.tastingNotes ?? [];
  const visibleChips = chips.slice(0, 3);
  const extraChips = chips.length - visibleChips.length;
  const ratioStr = ratio(entry.coffeeGrams, entry.waterMl);
  const h1 = [methodLabelFromId(entry.methodId), ratioStr].filter(Boolean).join(" · ");

  return (
    <article className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Card header row — tap anywhere except pencil to toggle */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={onToggle} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="w-12 h-12 rounded-xl bg-espresso/20 border border-espresso/30 flex items-center justify-center shrink-0 overflow-hidden">
            <Image src={imgSrc} alt="" width={32} height={32} className="w-8 h-8 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-100 truncate">{h1}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{beanName}</p>

            {entry.notes && (
              <p className="text-xs text-slate-300 italic mt-0.5 truncate">"{entry.notes}"</p>
            )}

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

            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500">{formatTime(entry.createdAt)}</span>
              {typeof entry.rating === "number" && (
                <span className="flex items-center gap-0.5 text-xs text-primary font-semibold">
                  <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>star</span>
                  {entry.rating}/10
                </span>
              )}
              {entry.isFavourite && (
                <span className="material-symbols-outlined text-primary" style={{ fontSize: "13px" }}>favorite</span>
              )}
            </div>
          </div>
        </button>

        {/* Edit pencil */}
        <button
          type="button"
          onClick={onEdit}
          className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 hover:bg-primary/20 transition-colors"
          aria-label="Edit brew"
        >
          <span className="material-symbols-outlined text-primary" style={{ fontSize: "16px" }}>edit</span>
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-primary/15 px-4 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-primary/10 rounded-xl py-2 px-1">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Extraction</p>
              <p className="text-sm font-bold text-slate-100 mt-0.5">{entry.brewTime}</p>
            </div>
            <div className="bg-primary/10 rounded-xl py-2 px-1">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Grind</p>
              <p className="text-sm font-bold text-slate-100 mt-0.5">
                {entry.grinderClicks ? `${entry.grinderClicks} clicks` : entry.grindSize}
              </p>
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

          <button
            type="button"
            onClick={onShare}
            className="flex items-center gap-2 text-xs font-semibold text-primary/70 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-base">share</span>
            Share this brew
          </button>

        </div>
      )}
    </article>
  );
}

export default function JournalPage() {
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(searchParams.get("expand"));
  const [editBrewId, setEditBrewId] = useState<string | null>(null);
  const [sharingBrewId, setSharingBrewId] = useState<string | null>(null);
  const [isSharingStats, setIsSharingStats] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ methods: [], beanIds: [] });
  const [view, setView] = useState<"journal" | "stats">("journal");
  const statsWrapperRef = useRef<HTMLDivElement>(null);

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

  // Unique methods and beans present in history
  const availableMethods = useMemo(() => {
    const seen = new Set<string>();
    for (const e of entries) if (e.methodId) seen.add(e.methodId);
    return ALL_METHODS.map((m) => m.id).filter((id) => seen.has(id));
  }, [entries]);

  const availableBeans = useMemo(() => {
    const seen = new Set<string>();
    for (const e of entries) if (e.beanId) seen.add(e.beanId);
    return beans
      .filter((b) => seen.has(b.id))
      .map((b) => ({ id: b.id, label: `${b.roaster} — ${b.beanName}` }));
  }, [entries, beans]);

  const filtered = useMemo(() => {
    return recentFirst.filter((entry) => {
      if (filters.methods.length > 0 && (!entry.methodId || !filters.methods.includes(entry.methodId))) return false;
      if (filters.beanIds.length > 0 && (!entry.beanId || !filters.beanIds.includes(entry.beanId))) return false;
      return true;
    });
  }, [recentFirst, filters]);

  const dateGroups = useMemo(() => {
    const map = new Map<string, FreestyleBrewEntry[]>();
    for (const entry of filtered) {
      const key = getDateGroup(entry.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return Array.from(map.entries());
  }, [filtered]);

  function renderCard(entry: FreestyleBrewEntry) {
    const bean = beans.find((b) => b.id === entry.beanId);
    const beanName = bean ? `${bean.roaster} — ${bean.beanName}` : "Unknown Bean";
    return (
      <BrewCard
        key={entry.id}
        entry={entry}
        beanName={beanName}
        isOpen={expandedId === entry.id}
        onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
        onEdit={() => setEditBrewId(entry.id)}
        onShare={() => setSharingBrewId(entry.id)}
      />
    );
  }

  return (
    <section className="pb-28">
      {/* Header with toggle */}
      <div className="px-4 pt-2 pb-3">
        <div className="flex items-center rounded-full border border-primary/20 bg-primary/5 p-1">
          <button
            onClick={() => setView("journal")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-semibold transition-colors ${
              view === "journal"
                ? "bg-primary text-background-dark"
                : "text-primary/70"
            }`}
          >
            <span className="material-symbols-outlined text-base">menu_book</span>
            Journal
          </button>
          <button
            onClick={() => setView("stats")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-semibold transition-colors ${
              view === "stats"
                ? "bg-primary text-background-dark"
                : "text-primary/70"
            }`}
          >
            <span className="material-symbols-outlined text-base">bar_chart</span>
            View Stats
          </button>
        </div>
      </div>

      {/* Floating filter button */}
      <div className="fixed bottom-28 right-4 z-30 rounded-2xl bg-background-dark/70 backdrop-blur-md">
        <FilterDropdown
          filters={filters}
          onChange={setFilters}
          availableMethods={availableMethods}
          availableBeans={availableBeans}
          dropdownPosition="above"
        />
      </div>

      {/* Content */}
      {view === "stats" ? (
        <>
          <div className="px-4 pb-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (!statsWrapperRef.current) return;
                setIsSharingStats(true);
                captureStatsAndShare(statsWrapperRef.current).finally(() => setIsSharingStats(false));
              }}
              disabled={isSharingStats}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary/70 hover:text-primary transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">share</span>
              {isSharingStats ? "Sharing…" : "Share Stats"}
            </button>
          </div>
          <div ref={statsWrapperRef}>
            <BrewStatsView entries={filtered} beans={beans} />
          </div>
        </>
      ) : loading && filtered.length === 0 ? (
        <p className="px-4 text-sm text-slate-500 py-8 text-center">Loading brews…</p>
      ) : filtered.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-600">menu_book</span>
          <p className="mt-2 text-sm text-slate-500">No brews found.</p>
        </div>
      ) : (
        <div className="px-4 space-y-5">
          {dateGroups.map(([dateLabel, groupEntries]) => (
            <div key={dateLabel}>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">{dateLabel}</p>
              <div className="space-y-2">{groupEntries.map(renderCard)}</div>
            </div>
          ))}
        </div>
      )}

      <BrewEditSheet
        entry={editBrewId ? entries.find((e) => e.id === editBrewId) ?? null : null}
        open={editBrewId !== null}
        onOpenChange={(o) => { if (!o) setEditBrewId(null); }}
      />

      {/* Off-screen brew share card capture */}
      {sharingBrewId && (() => {
        const entry = entries.find((e) => e.id === sharingBrewId);
        if (!entry) return null;
        const bean = beans.find((b) => b.id === entry.beanId);
        const beanName = bean ? `${bean.roaster} — ${bean.beanName}` : undefined;
        return (
          <div
            style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none" }}
            ref={(el) => {
              if (!el) return;
              captureAsBlob(el)
                .then((blob) => shareOrDownload(blob, "coffee-coach-brew.png", SHARE_CAPTION))
                .finally(() => setSharingBrewId(null));
            }}
          >
            <BrewShareCard entry={entry} beanName={beanName} />
          </div>
        );
      })()}
    </section>
  );
}
