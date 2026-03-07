import { getUserPreferences, setUserPreferences } from "./store";

type PreferencesPayload = {
  last_used_bean_id?: string | null;
  last_used_brew_method?: string | null;
};

function getUserId(request: Request) {
  return request.headers.get("X-User-Id") ?? "coffee-coach-user";
}

export async function GET(request: Request) {
  const userId = getUserId(request);
  return Response.json(getUserPreferences(userId));
}

export async function PATCH(request: Request) {
  const userId = getUserId(request);
  const payload = (await request.json()) as PreferencesPayload;
  const current = getUserPreferences(userId);
  const next = {
    last_used_bean_id: payload.last_used_bean_id ?? current.last_used_bean_id ?? null,
    last_used_brew_method: payload.last_used_brew_method ?? current.last_used_brew_method ?? null,
  };
  setUserPreferences(userId, next);
  return Response.json(next);
}
