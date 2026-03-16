import type { CoachingChangeApi } from "@/lib/api";

const GRIND_SIZES = ["Extra Fine", "Fine", "Medium-Fine", "Medium", "Medium-Coarse", "Coarse"] as const;

type CoachingPayload = {
  brew_id: string;
  symptom?: string;
  goals?: string[];
  current_params?: {
    coffeeGrams: number;
    waterMl: number;
    waterTempC: number | null;
    grindSize: string;
    brewTime: string;
  };
  recent_brews?: Array<{
    rating: number | null;
    coaching_changes: CoachingChangeApi[] | null;
    coach_followed: boolean | null;
  }>;
};

type CoachingChange = {
  param: "grindSize" | "brewTime" | "coffeeGrams" | "waterTempC";
  direction: "finer" | "coarser" | "increase" | "decrease";
  suggestion: string;
  previousValue?: string | number;
  newValue?: string | number;
};

// ─── Grind helpers ──────────────────────────────────────────────────────────

function shiftGrind(current: string, direction: "finer" | "coarser"): string {
  const idx = GRIND_SIZES.indexOf(current as typeof GRIND_SIZES[number]);
  if (idx === -1) return current;
  const newIdx = direction === "finer" ? Math.max(0, idx - 1) : Math.min(GRIND_SIZES.length - 1, idx + 1);
  return GRIND_SIZES[newIdx];
}

// ─── Brew time helpers ──────────────────────────────────────────────────────

function parseBrewTime(mmss: string): number {
  const parts = mmss.split(":");
  if (parts.length !== 2) return 0;
  const mins = parseInt(parts[0] ?? "0", 10);
  const secs = parseInt(parts[1] ?? "0", 10);
  return (isNaN(mins) ? 0 : mins) * 60 + (isNaN(secs) ? 0 : secs);
}

function formatBrewTime(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// ─── Compute new values from direction ──────────────────────────────────────

function computeNewValue(
  param: CoachingChange["param"],
  direction: CoachingChange["direction"],
  currentParams: CoachingPayload["current_params"],
): { previousValue: string | number; newValue: string | number } | null {
  if (!currentParams) return null;

  switch (param) {
    case "grindSize": {
      const prev = currentParams.grindSize;
      const next = shiftGrind(prev, direction as "finer" | "coarser");
      return { previousValue: prev, newValue: next };
    }
    case "coffeeGrams": {
      const prev = currentParams.coffeeGrams;
      const delta = direction === "increase" ? 1 : -1;
      const next = Math.max(1, +(prev + delta).toFixed(1));
      return { previousValue: prev, newValue: next };
    }
    case "waterTempC": {
      const prev = currentParams.waterTempC;
      if (prev == null) return null;
      const delta = direction === "increase" ? 2 : -2;
      const next = Math.max(1, Math.min(100, prev + delta));
      return { previousValue: prev, newValue: next };
    }
    case "brewTime": {
      const prev = currentParams.brewTime;
      const prevSecs = parseBrewTime(prev);
      const delta = direction === "increase" ? 15 : -15;
      const next = formatBrewTime(prevSecs + delta);
      return { previousValue: prev, newValue: next };
    }
    default:
      return null;
  }
}

// ─── Symptom → coaching ─────────────────────────────────────────────────────

function symptomFix(symptom: string) {
  const map: Record<string, string> = {
    Sour: "Brew a touch finer and extend contact time slightly.",
    Bitter: "Go slightly coarser and shorten brew contact time.",
    "Weak/Watery": "Increase dose slightly or tighten your ratio.",
    "Flat/No Sweetness": "Raise extraction with a finer grind and steadier pour.",
    "Muddy/Silty": "Coarsen grind slightly and pour more gently.",
    "Woody/Papery": "Lower extraction and reduce late-stage agitation.",
    Hollow: "Aim for a more even pour structure and stable temperature.",
  };
  return map[symptom] ?? "Keep variables tight and adjust one parameter at a time.";
}

function symptomChanges(symptom: string): CoachingChange[] {
  const map: Record<string, CoachingChange[]> = {
    Sour: [
      { param: "grindSize", direction: "finer", suggestion: "grind finer than last time" },
      { param: "brewTime", direction: "increase", suggestion: "extend brew time slightly" },
    ],
    Bitter: [
      { param: "grindSize", direction: "coarser", suggestion: "go slightly coarser" },
      { param: "brewTime", direction: "decrease", suggestion: "shorten brew time" },
    ],
    "Weak/Watery": [
      { param: "coffeeGrams", direction: "increase", suggestion: "increase dose slightly" },
    ],
    "Flat/No Sweetness": [
      { param: "grindSize", direction: "finer", suggestion: "grind finer for more sweetness" },
    ],
    "Muddy/Silty": [
      { param: "grindSize", direction: "coarser", suggestion: "coarsen grind slightly" },
    ],
    "Woody/Papery": [
      { param: "grindSize", direction: "coarser", suggestion: "go coarser to lower extraction" },
      { param: "waterTempC", direction: "decrease", suggestion: "lower water temperature" },
    ],
  };
  return map[symptom] ?? [];
}

// ─── Goals → coaching ───────────────────────────────────────────────────────

function goalsFix(goals: string[]) {
  if (goals.includes("more sweetness")) {
    return "Try a slightly finer grind with controlled, even pours for more sweetness.";
  }
  if (goals.includes("more body")) {
    return "Increase dose a little and keep agitation minimal to build body.";
  }
  if (goals.includes("less bitter")) {
    return "Go slightly coarser and shorten your brew time to reduce bitterness.";
  }
  if (goals.includes("less sour")) {
    return "Grind a touch finer and extend contact time to reduce sourness.";
  }
  if (goals.includes("more clarity")) {
    return "Try a slightly finer grind for a cleaner, more transparent cup.";
  }
  return "Use a small grind adjustment and keep ratio consistent for the next brew.";
}

function goalsChanges(goals: string[]): CoachingChange[] {
  const changes: CoachingChange[] = [];
  if (goals.includes("more sweetness")) {
    changes.push({ param: "grindSize", direction: "finer", suggestion: "grind finer for more sweetness" });
  }
  if (goals.includes("more body")) {
    changes.push({ param: "coffeeGrams", direction: "increase", suggestion: "increase dose for more body" });
  }
  if (goals.includes("more clarity")) {
    changes.push({ param: "grindSize", direction: "finer", suggestion: "grind finer for more clarity" });
  }
  if (goals.includes("less bitter")) {
    changes.push({ param: "grindSize", direction: "coarser", suggestion: "go coarser to reduce bitterness" });
  }
  if (goals.includes("less sour")) {
    changes.push({ param: "grindSize", direction: "finer", suggestion: "grind finer to reduce sourness" });
  }
  return changes;
}

// ─── Trend detection (Phase 5) ──────────────────────────────────────────────

type RecentBrew = {
  rating: number | null;
  coaching_changes: CoachingChangeApi[] | null;
  coach_followed: boolean | null;
};

function detectTrend(recentBrews: RecentBrew[]): string {
  const ratings = recentBrews.map((b) => b.rating).filter((r): r is number => r != null);
  if (ratings.length < 2) return "plateau";

  // Check oscillating (high variance)
  if (ratings.length >= 3) {
    const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const variance = ratings.reduce((sum, r) => sum + (r - mean) ** 2, 0) / ratings.length;
    if (Math.sqrt(variance) > 2.0) return "oscillating";
  }

  // Check plateau (all within 1-point range)
  if (ratings.length >= 4) {
    const min = Math.min(...ratings);
    const max = Math.max(...ratings);
    if (max - min <= 1) return "plateau";
  }

  // Compare most recent to prior — ratings are newest-first
  const latest = ratings[0];
  const previous = ratings[1];
  if (latest > previous) return "improving";
  if (latest < previous) return "worsening";
  return "plateau";
}

type Escalation = {
  type: "recipe" | "method" | "beans";
  message: string;
  suggested_recipe_id?: string;
};

function detectEscalation(recentBrews: RecentBrew[]): Escalation | undefined {
  if (recentBrews.length < 3) return undefined;

  // Find the most common param+direction in recent coaching
  const paramDirectionCounts = new Map<string, number>();
  let followedCount = 0;

  for (const brew of recentBrews.slice(0, 3)) {
    if (brew.coaching_changes) {
      for (const change of brew.coaching_changes) {
        const key = `${change.param}:${change.direction}`;
        paramDirectionCounts.set(key, (paramDirectionCounts.get(key) ?? 0) + 1);
      }
    }
    if (brew.coach_followed === true) followedCount++;
  }

  // Check if the same advice was given 3 times
  let repeatedAdvice: string | null = null;
  for (const [key, count] of paramDirectionCounts) {
    if (count >= 3) {
      repeatedAdvice = key;
      break;
    }
  }
  // Also check 2 times repeated with coach followed
  if (!repeatedAdvice) {
    for (const [key, count] of paramDirectionCounts) {
      if (count >= 2 && followedCount >= 2) {
        repeatedAdvice = key;
        break;
      }
    }
  }

  if (!repeatedAdvice) return undefined;

  // Check if ratings haven't improved
  const ratings = recentBrews.map((b) => b.rating).filter((r): r is number => r != null);
  if (ratings.length >= 2) {
    const latest = ratings[0];
    const oldest = ratings[ratings.length - 1];
    if (latest > oldest + 1) return undefined; // Actually improving, no escalation
  }

  const [param] = repeatedAdvice.split(":");
  const paramLabel =
    param === "grindSize" ? "grind adjustment"
    : param === "coffeeGrams" ? "dose change"
    : param === "waterTempC" ? "temperature adjustment"
    : "timing change";

  // Escalate in order: recipe → method → beans
  if (followedCount >= 2) {
    return {
      type: "recipe",
      message: `You've followed the same ${paramLabel} advice multiple times without improvement. A different recipe might better suit your beans and preferences.`,
    };
  }

  return {
    type: "method",
    message: `This bean and method combo might have reached its limit. Consider trying a different brewing method for a fresh perspective.`,
  };
}

// ─── Main handler ───────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const payload = (await request.json()) as CoachingPayload;
  const goals = payload.goals ?? [];

  let fix = "Keep your variables consistent and repeat once before a bigger change.";
  let changes: CoachingChange[] = [];

  if (payload.symptom) {
    fix = symptomFix(payload.symptom);
    changes = symptomChanges(payload.symptom);
  } else if (goals.length) {
    fix = goalsFix(goals);
    changes = goalsChanges(goals);
  }

  // Compute actual new values if current params are available
  if (payload.current_params) {
    changes = changes.map((change) => {
      const computed = computeNewValue(change.param, change.direction, payload.current_params);
      if (computed) {
        return { ...change, previousValue: computed.previousValue, newValue: computed.newValue };
      }
      return change;
    });
  }

  // Trend detection
  let trend = goals.includes("consistency") ? "oscillating" : "plateau";
  let escalation: Escalation | undefined;

  if (payload.recent_brews && payload.recent_brews.length >= 2) {
    trend = detectTrend(payload.recent_brews);
    escalation = detectEscalation(payload.recent_brews);
  }

  const freshness_caveat =
    payload.symptom === "Woody/Papery"
      ? "Bean freshness may be flattening the cup; check roast date and storage."
      : undefined;

  return Response.json({
    fix,
    changes,
    freshness_caveat,
    trend,
    ...(escalation ? { escalation } : {}),
  });
}
