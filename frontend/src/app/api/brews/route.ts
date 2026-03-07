type BrewRecord = Record<string, unknown> & {
  id: string;
  created_at: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __coffeeCoachBrews: BrewRecord[] | undefined;
}

const brews = globalThis.__coffeeCoachBrews ?? [];
globalThis.__coffeeCoachBrews = brews;

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const saved: BrewRecord = {
    ...payload,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    created_at: new Date().toISOString(),
  };
  brews.unshift(saved);
  return Response.json(saved, { status: 201 });
}
