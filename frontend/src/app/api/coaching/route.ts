type CoachingPayload = {
  brew_id: string;
  symptom?: string;
  goals?: string[];
};

type CoachingChange = {
  param: "grindSize" | "brewTime" | "coffeeGrams" | "waterTempC";
  direction: "finer" | "coarser" | "increase" | "decrease";
  suggestion: string;
};

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

  const trend = goals.includes("consistency") ? "oscillating" : "plateau";
  const freshness_caveat =
    payload.symptom === "Woody/Papery"
      ? "Bean freshness may be flattening the cup; check roast date and storage."
      : undefined;

  return Response.json({
    fix,
    changes,
    freshness_caveat,
    trend,
  });
}
