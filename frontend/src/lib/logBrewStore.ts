import { create } from "zustand";
import { persist } from "zustand/middleware";

type LogBrewSelectionStore = {
  selectedBeanId: string | null;
  selectedMethodId: string | null;
  selectedPourOverDeviceId: string | null;
  setStepOneSelection: (payload: {
    beanId: string;
    methodId: string;
    pourOverDeviceId: string | null;
  }) => void;
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
    }),
    {
      name: "coffee-coach-log-brew-selection",
    },
  ),
);
