type CoachingPayload = {
  brew_id: string;
  symptom?: string;
  goals?: string[];
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

function goalsFix(goals: string[]) {
  if (goals.includes("more sweetness")) {
    return "Try a slightly finer grind with controlled, even pours for more sweetness.";
  }
  if (goals.includes("more body")) {
    return "Increase dose a little and keep agitation minimal to build body.";
  }
  return "Use a small grind adjustment and keep ratio consistent for the next brew.";
}

export async function POST(request: Request) {
  const payload = (await request.json()) as CoachingPayload;
  const goals = payload.goals ?? [];

  let fix = "Keep your variables consistent and repeat once before a bigger change.";
  if (payload.symptom) {
    fix = symptomFix(payload.symptom);
  } else if (goals.length) {
    fix = goalsFix(goals);
  }

  const trend = goals.includes("consistency") ? "oscillating" : "plateau";
  const freshness_caveat =
    payload.symptom === "Woody/Papery"
      ? "Bean freshness may be flattening the cup; check roast date and storage."
      : undefined;

  return Response.json({
    fix,
    freshness_caveat,
    trend,
  });
}
