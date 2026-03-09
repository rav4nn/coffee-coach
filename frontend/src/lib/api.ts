const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// In-memory token set by AuthTokenSync after sign-in. Never stored in localStorage.
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export async function apiFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(_accessToken ? { Authorization: `Bearer ${_accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response;
}

export type ApiUserBean = {
  id: string;
  coffee_id: string;
  name: string;
  roaster: string;
  roast_date: string | null;
  is_pre_ground: boolean;
};

export type BrewMethodApi = {
  method_id: string;
  display_name: string;
  parent_method: string | null;
};

export type GuidedRecipeStep = {
  time_seconds: number;
  instruction: string;
  duration_seconds: number | null;
};

export type GuidedRecipePour = {
  time_seconds: number;
  target_water_g: number;
};

export type GuidedRecipe = {
  recipe_id: string;
  title: string;
  author: string;
  method: string;
  coffee_g: number;
  water_ml: number;
  water_temp_c: number;
  grind_size: string;
  brew_time_seconds: number;
  bloom_water_g: number | null;
  bloom_duration_seconds: number | null;
  steps?: GuidedRecipeStep[];
  pours: GuidedRecipePour[] | null;
  expected_flavour: {
    acidity: string;
    sweetness: string;
    body: string;
    bitterness: string;
  } | null;
};

export type UserPreferencesApi = {
  last_used_bean_id: string | null;
  last_used_brew_method: string | null;
};

export type CreateUserBeanPayload = {
  coffee_id: string;
  roast_date?: string | null;
  is_pre_ground: boolean;
};

function requestInit(init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(_accessToken ? { Authorization: `Bearer ${_accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  };
}

export async function getCatalogRoasters() {
  const response = await fetch("/api/beans/catalog/roasters", requestInit());
  if (!response.ok) {
    throw new Error("Failed to fetch roasters");
  }

  return (await response.json()) as string[];
}

export async function getCatalogBeansByRoaster(roaster: string) {
  const response = await fetch(`/api/beans/catalog?roaster=${encodeURIComponent(roaster)}`, requestInit());
  if (!response.ok) {
    throw new Error("Failed to fetch beans by roaster");
  }

  const data = (await response.json()) as { beans: { coffee_id: string; name: string; roaster: string }[] };
  return data.beans;
}

export async function getUserBeansApi() {
  const response = await fetch("/api/user/beans", requestInit());
  if (!response.ok) {
    throw new Error("Failed to fetch user beans");
  }

  const data = (await response.json()) as { beans: ApiUserBean[] };
  return data.beans;
}

export async function postUserBeanApi(payload: CreateUserBeanPayload) {
  const response = await fetch(
    "/api/user/beans",
    requestInit({
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
  if (!response.ok) {
    throw new Error("Failed to save bean");
  }

  return (await response.json()) as ApiUserBean;
}

export async function deleteUserBeanApi(id: string) {
  const response = await fetch(
    `/api/user/beans/${id}`,
    requestInit({
      method: "DELETE",
    }),
  );
  if (!response.ok) {
    throw new Error("Failed to delete bean");
  }
}

export async function getBrewMethodsApi(parent?: string) {
  const suffix = parent ? `?parent=${encodeURIComponent(parent)}` : "";
  const response = await fetch(`/api/brew-methods${suffix}`, requestInit());
  if (!response.ok) {
    throw new Error("Failed to fetch brew methods");
  }
  return (await response.json()) as BrewMethodApi[];
}

export async function getUserPreferencesApi() {
  const response = await fetch("/api/user/preferences", requestInit());
  if (!response.ok) {
    throw new Error("Failed to fetch user preferences");
  }
  return (await response.json()) as UserPreferencesApi;
}

export async function patchUserPreferencesApi(preferences: Partial<UserPreferencesApi>) {
  const response = await fetch(
    "/api/user/preferences",
    requestInit({
      method: "PATCH",
      body: JSON.stringify(preferences),
    }),
  );
  if (!response.ok) {
    throw new Error("Failed to update user preferences");
  }
  return (await response.json()) as UserPreferencesApi;
}

export async function getRecipesApi(method?: string) {
  const suffix = method ? `?method=${encodeURIComponent(method)}` : "";
  const response = await fetch(`/api/recipes${suffix}`, requestInit());
  if (!response.ok) {
    throw new Error("Failed to fetch recipes");
  }
  const data = (await response.json()) as { recipes: GuidedRecipe[] };
  return data.recipes;
}

export async function getRecipeByIdApi(recipeId: string) {
  const response = await fetch(`/api/recipes/${recipeId}`, requestInit());
  if (!response.ok) {
    throw new Error("Could not load this recipe");
  }
  return (await response.json()) as GuidedRecipe;
}

export async function postBrewApi(payload: Record<string, unknown>) {
  const response = await fetch(
    "/api/brews",
    requestInit({
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
  if (!response.ok) {
    throw new Error("Failed to save brew");
  }
  return (await response.json()) as Record<string, unknown>;
}

export type CoachingResponseApi = {
  fix: string;
  freshness_caveat?: string;
  trend?: "improving" | "worsening" | "oscillating" | "plateau" | string;
};

export async function postCoachingApi(payload: {
  brew_id: string;
  symptom?: string;
  goals?: string[];
}) {
  const response = await fetch(
    "/api/coaching",
    requestInit({
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
  if (!response.ok) {
    throw new Error("Failed to get coaching");
  }
  return (await response.json()) as CoachingResponseApi;
}

export type UserProfileUpdatePayload = {
  name: string;
  age: number;
  avatar: string;
  primary_equipment: string[];
};

export async function patchUserProfileApi(payload: UserProfileUpdatePayload) {
  const response = await fetch(
    "/api/users/me",
    requestInit({
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  );
  if (!response.ok) {
    throw new Error("Failed to save profile");
  }
}

export async function postFavouriteBrewApi(payload: { brew_id: string }) {
  const response = await fetch(
    "/api/brews/favourite",
    requestInit({
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
  if (!response.ok) {
    throw new Error("Failed to save favourite brew");
  }
  return (await response.json()) as { ok: boolean; brew_id: string };
}
