import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { FreestyleBrewEntry, CoachingChange } from "@/lib/brewHistoryStore";

type LogBrewSelectionStore = {
  selectedBeanId: string | null;
  selectedMethodId: string | null;
  selectedPourOverDeviceId: string | null;
  setStepOneSelection: (payload: {
    beanId: string;
    methodId: string;
    pourOverDeviceId: string | null;
  }) => void;
  // Coach mode — not persisted
  coachBrewRef: FreestyleBrewEntry | null;
  coachChanges: CoachingChange[] | null;
  setCoachMode: (brew: FreestyleBrewEntry, changes: CoachingChange[]) => void;
  clearCoachMode: () => void;
};

export const useLogBrewStore = create<LogBrewSelectionStore>()(
  persist(
    (set) => ({
      selectedBeanId: null,
      selectedMethodId: null,
      selectedPourOverDeviceId: null,
      setStepOneSelection: (payload) =>
        set({
          selectedBeanId: payload.beanId,
          selectedMethodId: payload.methodId,
          selectedPourOverDeviceId: payload.pourOverDeviceId,
        }),
      coachBrewRef: null,
      coachChanges: null,
      setCoachMode: (brew, changes) =>
        set({ coachBrewRef: brew, coachChanges: changes }),
      clearCoachMode: () =>
        set({ coachBrewRef: null, coachChanges: null }),
    }),
    {
      name: "coffee-coach-log-brew-selection",
      partialize: (state) => ({
        selectedBeanId: state.selectedBeanId,
        selectedMethodId: state.selectedMethodId,
        selectedPourOverDeviceId: state.selectedPourOverDeviceId,
      }),
    },
  ),
);
