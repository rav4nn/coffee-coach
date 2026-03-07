type StoredBean = {
  id: string;
  coffee_id: string;
  name: string;
  roaster: string;
  roast_date: string | null;
  is_pre_ground: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __coffeeCoachUserBeans: Map<string, StoredBean[]> | undefined;
}

const userBeansMap = globalThis.__coffeeCoachUserBeans ?? new Map<string, StoredBean[]>();
globalThis.__coffeeCoachUserBeans = userBeansMap;

export function getUserBeans(userId: string) {
  return userBeansMap.get(userId) ?? [];
}

export function setUserBeans(userId: string, beans: StoredBean[]) {
  userBeansMap.set(userId, beans);
}
