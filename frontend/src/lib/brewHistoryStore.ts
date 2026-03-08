import { create } from "zustand";
import { persist } from "zustand/middleware";

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
};

type BrewHistoryStore = {
  entries: FreestyleBrewEntry[];
  addEntry: (entry: Omit<FreestyleBrewEntry, "id" | "createdAt">) => void;
  updateEntry: (id: string, patch: Partial<FreestyleBrewEntry>) => void;
};

export const useBrewHistoryStore = create<BrewHistoryStore>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((state) => ({
          entries: [
            {
              rating: null,
              coachingFeedback: null,
              isFavourite: false,
              ...entry,
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              createdAt: new Date().toISOString(),
            },
            ...state.entries,
          ],
        })),
      updateEntry: (id, patch) =>
        set((state) => ({
          entries: state.entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
        })),
    }),
    {
      name: "coffee-coach-brew-history",
    },
  ),
);
