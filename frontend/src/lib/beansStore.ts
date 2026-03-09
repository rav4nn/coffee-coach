import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export const useBeansStore = create<BeansStore>()(
  persist(
    (set, get) => ({
      userBeans: [],
      isLoading: false,
      fetchBeans: async () => {
        set({ isLoading: true });
        try {
          const beans = await getUserBeansApi();
          set({ userBeans: normalize(beans) });
        } catch {
          // Keep persisted local value if API is unavailable.
        } finally {
          set({ isLoading: false });
        }
      },
      addBean: async (bean) => {
        try {
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
          return;
        } catch {
          // API mock unavailable: store locally via persisted Zustand.
        }

        set((state) => ({
          userBeans: [
            {
              id: `${Date.now()}`,
              coffeeId: bean.coffee_id,
              beanName: bean.name,
              roaster: bean.roaster,
              roastDate: bean.roast_date ?? null,
              isPreGround: bean.is_pre_ground,
            },
            ...state.userBeans,
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
    }),
    {
      name: typeof window !== "undefined"
        ? `coffee-coach-beans-${window.__CC_USER_ID__ ?? "anon"}`
        : "coffee-coach-beans-anon",
      partialize: (state) => ({ userBeans: state.userBeans }),
    },
  ),
);
