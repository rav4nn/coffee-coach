import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BrewSessionStep = {
  step_index: number;
  instruction: string;
  expected_duration_seconds: number | null;
  actual_duration_seconds: number | null;
  expected_pour_weight_g: number | null;
  actual_pour_weight_g: number | null;
  deviation_note: string | null;
  confirmed: boolean;
  completed_at: string | null;
};

export type BrewSession = {
  recipe_id: string;
  bean_id: string | null;
  method: string;
  started_at: string;
  steps: BrewSessionStep[];
  total_brew_time_seconds: number;
  completed_at: string | null;
};

type BrewSessionStore = {
  session: BrewSession | null;
  isBrewingActive: boolean;
  setBrewingActive: (active: boolean) => void;
  startSession: (payload: {
    recipe_id: string;
    bean_id: string | null;
    method: string;
    steps: BrewSessionStep[];
    started_at?: string;
  }) => void;
  completeStep: (
    stepIndex: number,
    payload?: {
      actual_duration_seconds?: number | null;
      actual_pour_weight_g?: number | null;
      deviation_note?: string | null;
    },
  ) => void;
  finalizeSession: (totalSeconds: number) => void;
  clearSession: () => void;
};

export const useBrewSessionStore = create<BrewSessionStore>()(
  persist(
    (set) => ({
      session: null,
      isBrewingActive: false,
      setBrewingActive: (active) => set({ isBrewingActive: active }),
      startSession: ({ recipe_id, bean_id, method, steps, started_at }) =>
        set({
          session: {
            recipe_id,
            bean_id,
            method,
            started_at: started_at ?? new Date().toISOString(),
            steps,
            total_brew_time_seconds: 0,
            completed_at: null,
          },
        }),
      completeStep: (stepIndex, payload) =>
        set((state) => {
          if (!state.session) {
            return state;
          }

          const nextSteps = state.session.steps.map((step) => {
            if (step.step_index !== stepIndex) {
              return step;
            }

            return {
              ...step,
              actual_duration_seconds: payload?.actual_duration_seconds ?? step.actual_duration_seconds,
              actual_pour_weight_g: payload?.actual_pour_weight_g ?? step.actual_pour_weight_g,
              deviation_note: payload?.deviation_note ?? step.deviation_note,
              confirmed: true,
              completed_at: new Date().toISOString(),
            };
          });

          return {
            session: {
              ...state.session,
              steps: nextSteps,
            },
          };
        }),
      finalizeSession: (totalSeconds) =>
        set((state) => {
          if (!state.session) {
            return state;
          }

          return {
            session: {
              ...state.session,
              total_brew_time_seconds: totalSeconds,
              completed_at: new Date().toISOString(),
            },
          };
        }),
      clearSession: () => set({ session: null, isBrewingActive: false }),
    }),
    {
      name: "coffee-coach-brew-session",
      partialize: (state) => ({ session: state.session }),
    },
  ),
);
