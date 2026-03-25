import { create } from "zustand";

export interface GuestCoachingChange {
  param: string;
  direction: string;
  suggestion: string;
  previousValue?: string | number | null;
  newValue?: string | number | null;
}

export interface GuestCoachingResult {
  fix: string;
  changes: GuestCoachingChange[];
  freshness_caveat: string | null;
  trend: string;
  escalation: null;
}

interface GuestBrewState {
  // Step 1
  symptoms: string[];
  goals: string[];
  // Step 2
  methodId: string | null;
  beanName: string | null;
  grinderName: string | null;
  coffeeGrams: number | null;
  waterMl: number | null;
  waterTempC: number | null;
  grindSize: string | null;
  grindClicks: number | null;
  brewTime: string | null;
  // Step 3
  rating: number;
  // Result
  coachingResult: GuestCoachingResult | null;

  // Actions
  setSymptoms: (symptoms: string[]) => void;
  setGoals: (goals: string[]) => void;
  setMethodId: (id: string | null) => void;
  setBeanName: (name: string | null) => void;
  setGrinderName: (name: string | null) => void;
  setBrewParams: (params: {
    coffeeGrams?: number | null;
    waterMl?: number | null;
    waterTempC?: number | null;
    grindSize?: string | null;
    grindClicks?: number | null;
    brewTime?: string | null;
  }) => void;
  setRating: (rating: number) => void;
  setCoachingResult: (result: GuestCoachingResult | null) => void;
  reset: () => void;
}

const INITIAL: Pick<
  GuestBrewState,
  | "symptoms" | "goals" | "methodId" | "beanName" | "grinderName"
  | "coffeeGrams" | "waterMl" | "waterTempC" | "grindSize"
  | "grindClicks" | "brewTime" | "rating" | "coachingResult"
> = {
  symptoms: [],
  goals: [],
  methodId: null,
  beanName: null,
  grinderName: null,
  coffeeGrams: null,
  waterMl: null,
  waterTempC: null,
  grindSize: null,
  grindClicks: null,
  brewTime: null,
  rating: 5,
  coachingResult: null,
};

export const useGuestBrewStore = create<GuestBrewState>((set) => ({
  ...INITIAL,
  setSymptoms: (symptoms) => set({ symptoms }),
  setGoals: (goals) => set({ goals }),
  setMethodId: (methodId) => set({ methodId }),
  setBeanName: (beanName) => set({ beanName }),
  setGrinderName: (grinderName) => set({ grinderName }),
  setBrewParams: (params) => set((s) => ({ ...s, ...params })),
  setRating: (rating) => set({ rating }),
  setCoachingResult: (coachingResult) => set({ coachingResult }),
  reset: () => set(INITIAL),
}));
