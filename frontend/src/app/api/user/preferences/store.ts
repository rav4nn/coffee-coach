type StoredPreferences = {
  last_used_bean_id: string | null;
  last_used_brew_method: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __coffeeCoachPreferences: Map<string, StoredPreferences> | undefined;
}

const preferencesMap = globalThis.__coffeeCoachPreferences ?? new Map<string, StoredPreferences>();
globalThis.__coffeeCoachPreferences = preferencesMap;

export function getUserPreferences(userId: string): StoredPreferences {
  return (
    preferencesMap.get(userId) ?? {
      last_used_bean_id: null,
      last_used_brew_method: null,
    }
  );
}

export function setUserPreferences(userId: string, preferences: StoredPreferences) {
  preferencesMap.set(userId, preferences);
}
