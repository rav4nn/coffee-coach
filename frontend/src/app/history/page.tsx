"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

import { BrewEditSheet } from "@/components/BrewEditSheet";
import { useBeansStore } from "@/lib/beansStore";
import { useBrewHistoryStore, type FreestyleBrewEntry } from "@/lib/brewHistoryStore";

const ALL_METHODS = [
  { id: "pour_over", label: "Pour Over" },
  { id: "aeropress", label: "Aeropress" },
  { id: "french_press", label: "French Press" },
  { id: "moka_pot", label: "Moka Pot" },
  { id: "cold_brew", label: "Cold Brew" },
  { id: "south_indian_filter", label: "Filter Kaapi" },
];

function methodLabel(methodId: string | null | undefined) {
  if (!methodId) return "Unknown Method";
  return methodId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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
}

function BrewCard({ entry, beanName, isOpen, onToggle, onEdit }: BrewCardProps) {
  const imgSrc = methodImage(entry.methodId);
  const chips = entry.tastingNotes ?? [];
  const visibleChips = chips.slice(0, 3);
  const extraChips = chips.length - visibleChips.length;
  const ratioStr = ratio(entry.coffeeGrams, entry.waterMl);
  const h1 = [methodLabel(entry.methodId), ratioStr].filter(Boolean).join(" · ");

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

        </div>
      )}
    </article>
  );
}

interface FilterState {
  methods: string[];
  beanIds: string[];
}

function FilterDropdown({
  filters,
  onChange,
  availableMethods,
  availableBeans,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  availableMethods: string[];
  availableBeans: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeCount = filters.methods.length + filters.beanIds.length;

  function toggleMethod(id: string) {
    const next = filters.methods.includes(id)
      ? filters.methods.filter((m) => m !== id)
      : [...filters.methods, id];
    onChange({ ...filters, methods: next });
  }

  function toggleBean(id: string) {
    const next = filters.beanIds.includes(id)
      ? filters.beanIds.filter((b) => b !== id)
      : [...filters.beanIds, id];
    onChange({ ...filters, beanIds: next });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm font-semibold transition-colors ${
          activeCount > 0
            ? "bg-primary text-background-dark border-primary"
            : "bg-primary/10 border-primary/20 text-primary/80"
        }`}
      >
        <span className="material-symbols-outlined text-base">tune</span>
        Filter
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-background-dark/20 text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-64 rounded-2xl border border-primary/20 bg-background-dark shadow-xl shadow-black/40 overflow-hidden">
          {availableMethods.length > 0 && (
            <div className="p-3 border-b border-primary/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Brew Method</p>
              <div className="flex flex-wrap gap-1.5">
                {availableMethods.map((id) => {
                  const label = ALL_METHODS.find((m) => m.id === id)?.label ?? methodLabel(id);
                  const active = filters.methods.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleMethod(id)}
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-colors ${
                        active
                          ? "bg-primary text-background-dark border-primary"
                          : "bg-primary/10 text-primary/70 border-primary/20"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {availableBeans.length > 0 && (
            <div className="p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Bean</p>
              <div className="flex flex-col gap-1">
                {availableBeans.map(({ id, label }) => {
                  const active = filters.beanIds.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleBean(id)}
                      className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-xl font-semibold border transition-colors text-left ${
                        active
                          ? "bg-primary text-background-dark border-primary"
                          : "bg-primary/10 text-primary/70 border-primary/20"
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">nutrition</span>
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeCount > 0 && (
            <div className="px-3 pb-3">
              <button
                onClick={() => onChange({ methods: [], beanIds: [] })}
                className="w-full h-8 rounded-xl bg-primary/5 border border-primary/15 text-xs text-slate-400 font-semibold"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function JournalPage() {
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(searchParams.get("expand"));
  const [editBrewId, setEditBrewId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ methods: [], beanIds: [] });

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
      />
    );
  }

  return (
    <section className="pb-28">
      {/* Header */}
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Brew Journal</h1>
        <FilterDropdown
          filters={filters}
          onChange={setFilters}
          availableMethods={availableMethods}
          availableBeans={availableBeans}
        />
      </div>

      {/* Content */}
      {loading && filtered.length === 0 ? (
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
    </section>
  );
}
