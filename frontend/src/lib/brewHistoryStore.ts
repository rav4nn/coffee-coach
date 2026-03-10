import { create } from "zustand";

export type FreestyleBrewEntry = {
  id: string;
  createdAt: string;
  beanId: string | null;
  methodId: string | null;
  rating?: number | null;
  coachingFeedback?: string | null;
  isFavourite?: boolean;
  coffeeGrams: number;
  waterMl: number;
  waterTempC: number | null;
  grindSize: "Extra Fine" | "Fine" | "Medium-Fine" | "Medium" | "Medium-Coarse" | "Coarse";
  brewTime: string;
  notes: string | null;
  tastingNotes: string[] | null;
};

type BrewHistoryStore = {
  entries: FreestyleBrewEntry[];
  loading: boolean;
  fetchEntries: () => Promise<void>;
  addEntry: (entry: Omit<FreestyleBrewEntry, "id" | "createdAt">) => Promise<void>;
  updateEntry: (id: string, patch: Partial<FreestyleBrewEntry>) => Promise<void>;
};

function toEntry(raw: Record<string, unknown>): FreestyleBrewEntry {
  return {
    id: String(raw.id),
    createdAt: String(raw.created_at),
    beanId: (raw.bean_id as string | null) ?? null,
    methodId: (raw.method_id as string | null) ?? null,
    rating: (raw.rating as number | null) ?? null,
    coachingFeedback: (raw.coaching_feedback as string | null) ?? null,
    isFavourite: (raw.is_favourite as boolean) ?? false,
    coffeeGrams: (raw.coffee_grams as number) ?? 0,
    waterMl: (raw.water_ml as number) ?? 0,
    waterTempC: (raw.water_temp_c as number | null) ?? null,
    grindSize: (raw.grind_size as FreestyleBrewEntry["grindSize"]) ?? "Medium",
    brewTime: (raw.brew_time as string) ?? "00:00",
    notes: (raw.notes as string | null) ?? null,
    tastingNotes: (raw.tasting_notes as string[] | null) ?? null,
  };
}

export const useBrewHistoryStore = create<BrewHistoryStore>()((set) => ({
  entries: [],
  loading: false,

  fetchEntries: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/brews", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const entries = (data as Record<string, unknown>[])
        .map(toEntry);
      set({ entries });
    } finally {
      set({ loading: false });
    }
  },

  addEntry: async (entry) => {
    const res = await fetch("/api/brews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brew_type: "freestyle",
        bean_id: entry.beanId,
        method_id: entry.methodId,
        coffee_grams: entry.coffeeGrams,
        water_ml: entry.waterMl,
        water_temp_c: entry.waterTempC,
        grind_size: entry.grindSize,
        brew_time: entry.brewTime,
        notes: entry.notes,
        tasting_notes: entry.tastingNotes ?? null,
      }),
    });
    if (!res.ok) throw new Error("Failed to save brew");
    const raw = await res.json();
    const newEntry = toEntry(raw as Record<string, unknown>);
    set((state) => ({ entries: [newEntry, ...state.entries] }));
  },

  updateEntry: async (id, patch) => {
    const apiPatch: Record<string, unknown> = {};
    if (patch.rating !== undefined) apiPatch.rating = patch.rating;
    if (patch.coachingFeedback !== undefined) apiPatch.coaching_feedback = patch.coachingFeedback;
    if (patch.isFavourite !== undefined) apiPatch.is_favourite = patch.isFavourite;
    if (patch.coffeeGrams !== undefined) apiPatch.coffee_grams = patch.coffeeGrams;
    if (patch.waterMl !== undefined) apiPatch.water_ml = patch.waterMl;
    if (patch.waterTempC !== undefined) apiPatch.water_temp_c = patch.waterTempC;
    if (patch.grindSize !== undefined) apiPatch.grind_size = patch.grindSize;
    if (patch.brewTime !== undefined) apiPatch.brew_time = patch.brewTime;
    if (patch.notes !== undefined) apiPatch.notes = patch.notes;
    if (patch.tastingNotes !== undefined) apiPatch.tasting_notes = patch.tastingNotes;

    if (Object.keys(apiPatch).length > 0) {
      const res = await fetch(`/api/brews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPatch),
      });
      if (!res.ok) throw new Error("Failed to update brew");
    }

    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  },
}));
