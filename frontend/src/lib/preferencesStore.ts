import { create } from "zustand";
import { persist } from "zustand/middleware";

import { patchUserPreferencesApi } from "@/lib/api";

type PreferencesStore = {
  last_used_bean_id: string | null;
  last_used_brew_method: string | null;
  setLastUsed: (beanId: string | null, method: string | null) => Promise<void>;
  setLocalLastUsed: (beanId: string | null, method: string | null) => void;
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      last_used_bean_id: null,
      last_used_brew_method: null,
      setLastUsed: async (beanId, method) => {
        set({
          last_used_bean_id: beanId,
          last_used_brew_method: method,
        });
        try {
          await patchUserPreferencesApi({
            last_used_bean_id: beanId,
            last_used_brew_method: method,
          });
        } catch {
          // Keep persisted local values when API is unavailable.
        }
      },
      setLocalLastUsed: (beanId, method) =>
        set({
          last_used_bean_id: beanId,
          last_used_brew_method: method,
        }),
    }),
    {
      name: "coffee-coach-preferences-store",
    },
  ),
);
