import { create } from "zustand";

import { deleteUserBeanApi, getUserBeansApi, postUserBeanApi, type CreateUserBeanPayload } from "@/lib/api";
import type { UserBean } from "@/lib/types";

type AddUserBeanInput = CreateUserBeanPayload & {
  name: string;
  roaster: string;
};

type BeansStore = {
  userBeans: UserBean[];
  isLoading: boolean;
  fetchBeans: () => Promise<void>;
  addBean: (bean: AddUserBeanInput) => Promise<void>;
  deleteBean: (id: string) => Promise<void>;
};

function normalize(beans: Awaited<ReturnType<typeof getUserBeansApi>>): UserBean[] {
  return beans.map((bean) => ({
    id: bean.id,
    coffeeId: bean.coffee_id,
    beanName: bean.name,
    roaster: bean.roaster,
    roastDate: bean.roast_date ?? null,
    isPreGround: bean.is_pre_ground,
  }));
}

export const useBeansStore = create<BeansStore>()((set, get) => ({
  userBeans: [],
  isLoading: false,
  fetchBeans: async () => {
    set({ isLoading: true });
    try {
      const beans = await getUserBeansApi();
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
          beanName: saved.name,
          roaster: saved.roaster,
          roastDate: saved.roast_date ?? null,
          isPreGround: saved.is_pre_ground,
        },
        ...state.userBeans.filter((item) => item.id !== saved.id),
      ],
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
