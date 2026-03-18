"use client";

import { useEffect, useRef, useState } from "react";

export const ALL_METHODS = [
  { id: "pour_over", label: "Pour Over" },
  { id: "v60", label: "V60" },
  { id: "chemex", label: "Chemex" },
  { id: "kalita_wave", label: "Kalita Wave" },
  { id: "clever_dripper", label: "Clever Dripper" },
  { id: "hario_switch", label: "Hario Switch" },
  { id: "aeropress", label: "Aeropress" },
  { id: "french_press", label: "French Press" },
  { id: "moka_pot", label: "Moka Pot" },
  { id: "cold_brew", label: "Cold Brew" },
  { id: "south_indian_filter", label: "Filter Kaapi" },
  { id: "wilfa_pour_over", label: "Wilfa Pour Over" },
  { id: "origami_dripper", label: "Origami Dripper" },
];

export interface FilterState {
  methods: string[];
  beanIds: string[];
}

export function methodLabelFromId(methodId: string | null | undefined) {
  if (!methodId) return "Unknown Method";
  const found = ALL_METHODS.find((m) => m.id === methodId);
  if (found) return found.label;
  return methodId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function FilterDropdown({
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
                  const label = methodLabelFromId(id);
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
