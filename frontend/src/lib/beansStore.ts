import { create } from "zustand";

import { deleteUserBeanApi, getUserBeansApi, patchUserBeanApi, postUserBeanApi, type CreateUserBeanPayload } from "@/lib/api";
import type { UserBean } from "@/lib/types";

type AddUserBeanInput = CreateUserBeanPayload & {
  name?: string;
  roaster?: string;
};

type BeansStore = {
  userBeans: UserBean[];
  isLoading: boolean;
  fetchBeans: () => Promise<void>;
  addBean: (bean: AddUserBeanInput) => Promise<void>;
  deleteBean: (id: string) => Promise<void>;
  restockBean: (id: string, remainingGrams: number) => Promise<void>;
};

function normalize(beans: Awaited<ReturnType<typeof getUserBeansApi>>): UserBean[] {
  return beans.map((bean) => ({
    id: bean.id,
    coffeeId: bean.coffee_id,
    submittedBeanId: bean.submitted_bean_id ?? null,
    beanName: bean.name,
    roaster: bean.roaster,
    roastDate: bean.roast_date ?? null,
    isPreGround: bean.is_pre_ground,
    imageUrl: (bean as { image_url?: string | null }).image_url ?? null,
    bagWeightGrams: bean.bag_weight_grams ?? null,
    remainingGrams: bean.remaining_grams ?? null,
    source: bean.source ?? "catalog",
    status: bean.status ?? null,
  }));
}

export const useBeansStore = create<BeansStore>()((set, get) => ({
  userBeans: [],
  isLoading: false,
  fetchBeans: async () => {
    set({ isLoading: true });
    try {
      // Use the Next.js proxy route so auth is handled server-side,
      // avoiding the race condition where _accessToken isn't set yet.
      const res = await fetch("/api/user/beans", { cache: "no-store" });
      if (!res.ok) return;
      const beans = await res.json();
      set({ userBeans: normalize(beans) });
    } finally {
      set({ isLoading: false });
    }
  },
  addBean: async (bean) => {
    const saved = await postUserBeanApi(bean);
    set((state) => ({
      userBeans: [
        {
          id: saved.id,
          coffeeId: saved.coffee_id,
          submittedBeanId: saved.submitted_bean_id ?? null,
          beanName: saved.name,
          roaster: saved.roaster,
          roastDate: saved.roast_date ?? null,
          isPreGround: saved.is_pre_ground,
          imageUrl: (saved as { image_url?: string | null }).image_url ?? null,
          bagWeightGrams: saved.bag_weight_grams ?? null,
          remainingGrams: saved.remaining_grams ?? null,
          source: saved.source ?? "catalog",
          status: saved.status ?? null,
        },
        ...state.userBeans.filter((item) => item.id !== saved.id),
      ],
    }));
  },
  restockBean: async (id, remainingGrams) => {
    const updated = await patchUserBeanApi(id, { remaining_grams: remainingGrams });
    set((state) => ({
      userBeans: state.userBeans.map((b) =>
        b.id === id ? { ...b, remainingGrams: updated.remaining_grams ?? null } : b,
      ),
    }));
  },
  deleteBean: async (id) => {
    const previous = get().userBeans;
    set((state) => ({ userBeans: state.userBeans.filter((bean) => bean.id !== id) }));
    try {
      await deleteUserBeanApi(id);
    } catch {
      set({ userBeans: previous });
    }
  },
}));
