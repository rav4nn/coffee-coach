import { create } from "zustand";
import { persist } from "zustand/middleware";

type AppState = {
  lastUsedBeanId: string | null;
  lastUsedMethod: string | null;
  setLastUsedBeanId: (beanId: string | null) => void;
  setLastUsedMethod: (method: string | null) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      lastUsedBeanId: null,
      lastUsedMethod: null,
      setLastUsedBeanId: (beanId) => set({ lastUsedBeanId: beanId }),
      setLastUsedMethod: (method) => set({ lastUsedMethod: method }),
    }),
    {
      name: "coffee-coach-store",
    },
  ),
);
