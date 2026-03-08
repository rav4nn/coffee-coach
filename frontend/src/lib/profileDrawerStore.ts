import { create } from "zustand";

type ProfileDrawerStore = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const useProfileDrawerStore = create<ProfileDrawerStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
