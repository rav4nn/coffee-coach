"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { getRecipeByIdApi, postBrewApi, type GuidedRecipe, type CoachingChangeApi } from "@/lib/api";
import { useBrewSessionStore } from "@/lib/brewSessionStore";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";
import { useLogBrewStore } from "@/lib/logBrewStore";
import { BrewTimePicker } from "@/components/BrewTimePicker";

type Phase = "preview" | "brewing" | "confirm" | "complete";

type MergedStep = {
  time_seconds: number;
  instruction: string;
  duration_seconds: number | null;
  target_water_g: number | null;
  is_brew_start?: boolean;
};

const GRIND_SIZES = [
  "Extra Fine",
  "Fine",
  "Medium-Fine",
  "Medium",
  "Medium-Coarse",
  "Coarse",
] as const;

/** Resolve math expressions like "(0.45 x 225)g" → "101g" in step instructions */
function resolveInstructionMath(instruction: string): string {
  return instruction.replace(/\((\d+\.?\d*)\s*x\s*(\d+\.?\d*)\)/g, (_, a, b) => {
    return String(Math.round(parseFloat(a) * parseFloat(b)));
  });
}

function formatTimer(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function parseTimeToSeconds(mmss: string): number {
  const parts = mmss.split(":");
  if (parts.length !== 2) return 0;
  const mins = parseInt(parts[0] ?? "0", 10);
  const secs = parseInt(parts[1] ?? "0", 10);
  return (isNaN(mins) ? 0 : mins) * 60 + (isNaN(secs) ? 0 : secs);
}

function methodIcon(method: string): string {
  const pourOverDevices = ["v60", "chemex", "kalita_wave", "clever_dripper", "hario_switch", "wilfa_pour_over", "origami_dripper", "pour_over"];
  if (pourOverDevices.includes(method)) return "water_drop";
  if (method === "aeropress") return "compress";
  if (method === "french_press") return "coffee_maker";
  if (method === "moka_pot") return "soup_kitchen";
  if (method === "cold_brew") return "ac_unit";
  if (method === "south_indian_filter") return "filter_alt";
  return "coffee";
}

function methodImage(method: string): string {
  const pourOverDevices = ["v60", "chemex", "kalita_wave", "clever_dripper", "hario_switch", "wilfa_pour_over", "origami_dripper", "pour_over"];
  if (pourOverDevices.includes(method)) return "pour_over.png";
  if (method === "aeropress") return "aeropress.png";
  if (method === "french_press") return "french_press.png";
  if (method === "moka_pot") return "moka_pot.png";
  if (method === "cold_brew") return "cold_brew.png";
  if (method === "south_indian_filter") return "filter.png";
  return "pour_over.png";
}

function coachAvatarForParam(param: string): string {
  if (param === "grindSize") return "/coach/img3_holding_whistle.png";
  if (param === "brewTime") return "/coach/img2_reading_book.png";
  if (param === "coffeeGrams") return "/coach/img2_painting.png";
  if (param === "waterTempC") return "/coach/img3_waving.png";
  return "/coach/img3_thumbs_whistle.png";
}

function methodDisplayName(method: string): string {
  const names: Record<string, string> = {
    v60: "V60", chemex: "Chemex", kalita_wave: "Kalita Wave",
    clever_dripper: "Clever Dripper", hario_switch: "Hario Switch",
    pour_over: "Pour Over", aeropress: "Aeropress",
    french_press: "French Press", moka_pot: "Moka Pot",
    cold_brew: "Cold Brew", south_indian_filter: "South Indian Filter",
    wilfa_pour_over: "Wilfa Pour Over", origami_dripper: "Origami Dripper",
  };
  return names[method] ?? method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function CoachHintInline({ label, param }: { label: string; param?: string }) {
  return (
    <div className="flex items-center gap-3 mt-2 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
      <Image
        src={param ? coachAvatarForParam(param) : "/coach/img3_thumbs_whistle.png"}
        alt="Coach"
        width={40}
        height={40}
        className="w-10 h-10 object-contain shrink-0"
      />
      <p className="text-xs text-slate-300 leading-relaxed">{label}</p>
    </div>
  );
}

export default function GuidedRecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const startSession = useBrewSessionStore((state) => state.startSession);
  const completeStep = useBrewSessionStore((state) => state.completeStep);
  const finalizeSession = useBrewSessionStore((state) => state.finalizeSession);
  const clearSession = useBrewSessionStore((state) => state.clearSession);
  const setBrewingActive = useBrewSessionStore((state) => state.setBrewingActive);
  const session = useBrewSessionStore((state) => state.session);
  const selectedBeanId = useLogBrewStore((state) => state.selectedBeanId);
  const selectedMethodId = useLogBrewStore((state) => state.selectedMethodId);
  const fetchEntries = useBrewHistoryStore((state) => state.fetchEntries);
  const explicitCoachBrewRef = useLogBrewStore((state) => state.coachBrewRef);
  const explicitCoachChanges = useLogBrewStore((state) => state.coachChanges);
  const clearCoachMode = useLogBrewStore((state) => state.clearCoachMode);
  const brewEntries = useBrewHistoryStore((state) => state.entries);

  // Ensure brew history is loaded for auto-detect coach matching
  useEffect(() => {
    if (brewEntries.length === 0) fetchEntries();
  }, [brewEntries.length, fetchEntries]);

  // Fetch user grinder for confirm phase
  useEffect(() => {
    fetch("/api/users/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((user) => {
        if (user.grinder_name) {
          setConfirmGrinderName(user.grinder_name as string);
          setConfirmUseClicks(true);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-detect: find a coached brew for this exact recipe + bean combo
  const autoDetectedCoach = useMemo(() => {
    if (!selectedBeanId) return null;
    const sorted = [...brewEntries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted.find(
      (e) =>
        e.recipeId === params.id &&
        e.beanId === selectedBeanId &&
        !!e.coachingFeedback &&
        e.coachingChanges &&
        e.coachingChanges.length > 0,
    ) ?? null;
  }, [brewEntries, params.id, selectedBeanId]);

  // Coach mode is active only when recipe + bean match
  const explicitMatchesRecipe = !!explicitCoachBrewRef && explicitCoachChanges !== null && explicitCoachBrewRef.recipeId === params.id && explicitCoachBrewRef.beanId === selectedBeanId;

  const coachBrewRef = explicitMatchesRecipe ? explicitCoachBrewRef : autoDetectedCoach;
  const coachChanges = explicitMatchesRecipe ? explicitCoachChanges : (autoDetectedCoach?.coachingChanges ?? null);
  const isCoachMode = !!coachBrewRef && coachChanges !== null && coachChanges.length > 0;

  const [recipe, setRecipe] = useState<GuidedRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [phase, setPhase] = useState<Phase>("preview");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stepStartAt, setStepStartAt] = useState<number>(Date.now());
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // Brew-context timer: tracks elapsedSeconds value when the is_brew_start step began
  const [brewStartElapsed, setBrewStartElapsed] = useState<number | null>(null);
  // Manual brew timer for recipes with no timed steps: records elapsedSeconds when user pressed Start
  const [manualBrewStartElapsed, setManualBrewStartElapsed] = useState<number | null>(null);

  // Confirm phase state
  const [confirmCoffeeG, setConfirmCoffeeG] = useState("");
  const [confirmWaterMl, setConfirmWaterMl] = useState("");
  const [confirmWaterTempC, setConfirmWaterTempC] = useState("");
  const [confirmGrindSize, setConfirmGrindSize] = useState<typeof GRIND_SIZES[number]>("Medium");
  const [confirmUseClicks, setConfirmUseClicks] = useState(false);
  const [confirmGrinderName, setConfirmGrinderName] = useState<string | null>(null);
  const [confirmGrinderClicks, setConfirmGrinderClicks] = useState("");
  const [confirmBrewTime, setConfirmBrewTime] = useState("00:00");
  const [confirmNotes, setConfirmNotes] = useState("");
  const [confirmStepTimes, setConfirmStepTimes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Complete phase state
  const [completedBrewId, setCompletedBrewId] = useState<string | null>(null);

  const autoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartedAt = useRef<string | null>(null);
  const currentStepRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);

  // Load recipe
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getRecipeByIdApi(params.id);
        if (!mounted) return;
        if (!data || !Array.isArray(data.steps)) { setHasError(true); return; }
        setRecipe(data);

        // Restore in-progress session if one exists for this recipe
        const existingSession = useBrewSessionStore.getState().session;
        if (mounted && existingSession && existingSession.recipe_id === params.id) {
          sessionStartedAt.current = existingSession.started_at;
          const completedCount = existingSession.steps.filter((s) => s.confirmed).length;
          if (existingSession.completed_at) {
            // Restore confirm phase
            const stepTimes = existingSession.steps.map((step) =>
              formatTimer(step.actual_duration_seconds ?? step.expected_duration_seconds ?? 0)
            );
            setConfirmStepTimes(stepTimes);
            const ep = coachModifiedParams;
            setConfirmCoffeeG(String(ep?.coffee_g ?? data.coffee_g));
            setConfirmWaterMl(String(ep?.water_ml ?? data.water_ml));
            setConfirmWaterTempC(String(ep?.water_temp_c ?? data.water_temp_c ?? ""));
            const grindVal = ep?.grind_size ?? data.grind_size;
            const grind = GRIND_SIZES.find((g) => g.toLowerCase() === grindVal?.toLowerCase()) ?? "Medium";
            setConfirmGrindSize(grind);
            setConfirmBrewTime(formatTimer(existingSession.total_brew_time_seconds));
            setPhase("confirm");
          } else {
            // Restore brewing phase
            const diff = Math.max(0, Math.floor((Date.now() - new Date(existingSession.started_at).getTime()) / 1000));
            setElapsedSeconds(diff);
            setCurrentIndex(completedCount);
            // Restore brew start elapsed if we've passed the is_brew_start step
            const brewStartIdx = data.steps?.findIndex((s) => s.is_brew_start) ?? -1;
            if (brewStartIdx >= 0 && completedCount > brewStartIdx) {
              const brewStartStep = data.steps![brewStartIdx];
              setBrewStartElapsed(brewStartStep.time_seconds);
            }
            setBrewingActive(true);
            setPhase("brewing");
          }
        }
      } catch {
        if (mounted) setHasError(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [params.id]);

  // Ensure brewing state is cleared when leaving this page
  useEffect(() => {
    return () => { setBrewingActive(false); };
  }, [setBrewingActive]);

  const mergedSteps = useMemo<MergedStep[]>(() => {
    if (!recipe || !Array.isArray(recipe.steps)) return [];
    const pourByTime = new Map((recipe.pours ?? []).map((p) => [p.time_seconds, p.target_water_g]));
    return recipe.steps.map((step) => ({
      time_seconds: step.time_seconds,
      instruction: step.instruction,
      duration_seconds: step.duration_seconds ?? null,
      target_water_g: pourByTime.get(step.time_seconds) ?? null,
      is_brew_start: step.is_brew_start ?? false,
    }));
  }, [recipe]);

  const coachModifiedParams = useMemo(() => {
    if (!coachChanges || !recipe) return null;
    const p = {
      coffee_g: recipe.coffee_g,
      water_ml: recipe.water_ml,
      water_temp_c: recipe.water_temp_c,
      grind_size: recipe.grind_size,
      brew_time_seconds: recipe.brew_time_seconds,
      grinder_clicks: null as number | null,
    };
    for (const change of coachChanges) {
      if (change.newValue != null) {
        if (change.param === "coffeeGrams") p.coffee_g = change.newValue as number;
        if (change.param === "waterTempC") p.water_temp_c = change.newValue as number;
        if (change.param === "grindSize") {
          if (typeof change.newValue === "number") {
            p.grinder_clicks = change.newValue;
          } else {
            p.grind_size = change.newValue as string;
          }
        }
        if (change.param === "brewTime") p.brew_time_seconds = parseTimeToSeconds(change.newValue as string);
      } else {
        // Fallback: compute adjustment from direction when newValue wasn't stored
        if (change.param === "coffeeGrams") {
          const pct = Math.max(1, Math.round(p.coffee_g * 0.1));
          p.coffee_g = change.direction === "increase" ? p.coffee_g + pct : Math.max(1, p.coffee_g - pct);
        }
        if (change.param === "waterTempC" && p.water_temp_c != null) {
          p.water_temp_c = change.direction === "increase"
            ? Math.min(100, p.water_temp_c + 2)
            : Math.max(1, p.water_temp_c - 2);
        }
        if (change.param === "brewTime") {
          const pct = Math.max(1, Math.round(p.brew_time_seconds * 0.1));
          p.brew_time_seconds = change.direction === "increase"
            ? p.brew_time_seconds + pct
            : Math.max(1, p.brew_time_seconds - pct);
        }
        if (change.param === "grindSize") {
          const prevClicks = coachBrewRef?.grinderClicks;
          if (prevClicks != null && prevClicks > 0) {
            const delta = change.direction === "finer" ? -2 : 2;
            p.grinder_clicks = Math.max(1, prevClicks + delta);
          } else {
            const annotation = change.direction === "finer" ? " (slightly finer)" : " (slightly coarser)";
            p.grind_size = (p.grind_size ?? "") + annotation;
          }
        }
      }
    }
    return p;
  }, [coachChanges, recipe, coachBrewRef]);

  const coachChangeMap = useMemo(() => {
    if (!coachChanges) return new Map<string, CoachingChangeApi>();
    const map = new Map<string, CoachingChangeApi>();
    for (const c of coachChanges) map.set(c.param, c);
    return map;
  }, [coachChanges]);

  const effectiveParams = coachModifiedParams ?? (recipe ? {
    coffee_g: recipe.coffee_g,
    water_ml: recipe.water_ml,
    water_temp_c: recipe.water_temp_c,
    grind_size: recipe.grind_size,
    brew_time_seconds: recipe.brew_time_seconds,
  } : null);

  // Total of only timed steps — used for the brew timer progress bar and default save value
  const totalTimerSeconds = useMemo(
    () => mergedSteps.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0),
    [mergedSteps],
  );

  const isColdBrew = recipe?.method === "cold_brew";
  const hasTimedSteps = totalTimerSeconds > 0;
  // Brew elapsed: counts from when the is_brew_start step was reached (keeps running through gaps)
  const brewElapsed = brewStartElapsed !== null ? elapsedSeconds - brewStartElapsed : 0;
  // Manual elapsed: for no-timed-step recipes, counts from when the user pressed the manual Start
  const manualElapsed = manualBrewStartElapsed !== null ? elapsedSeconds - manualBrewStartElapsed : 0;

  const currentStep = mergedSteps[currentIndex] ?? null;

  // Global brew timer
  useEffect(() => {
    if (phase !== "brewing") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      if (!sessionStartedAt.current) return;
      const diff = Math.max(0, Math.floor((Date.now() - new Date(sessionStartedAt.current).getTime()) / 1000));
      setElapsedSeconds(diff);
    }, 250);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Per-step countdown (recomputed every timer tick via elapsedSeconds)
  const countdownRemaining = useMemo(() => {
    if (!currentStep?.duration_seconds) return null;
    const elapsedInStep = Math.floor((Date.now() - stepStartAt) / 1000);
    return Math.max(0, currentStep.duration_seconds - elapsedInStep);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep?.duration_seconds, stepStartAt, elapsedSeconds]);

  // Auto-advance when countdown hits 0
  useEffect(() => {
    if (phase !== "brewing" || !currentStep?.duration_seconds || autoAdvancing) return;
    if (countdownRemaining !== null && countdownRemaining <= 0) {
      setAutoAdvancing(true);
      autoTimeoutRef.current = setTimeout(() => {
        handleAdvance();
        setAutoAdvancing(false);
      }, 1200);
    }
  // handleAdvance is defined below — safe to omit from deps since it uses refs/stable values
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvancing, countdownRemaining, currentStep?.duration_seconds, phase]);

  // Scroll to top when brewing starts (after layout settles)
  useEffect(() => {
    if (phase === "brewing") {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
    }
  }, [phase]);

  // Reset step timer and scroll current step into view when index changes
  useEffect(() => {
    setStepStartAt(Date.now());
    if (phase === "brewing") {
      // Start brew progress timer when the is_brew_start step is reached
      const step = mergedSteps[currentIndex];
      if (step?.is_brew_start && brewStartElapsed === null) {
        setBrewStartElapsed(elapsedSeconds);
      }
      setTimeout(() => {
        currentStepRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  function handleStart() {
    if (!recipe || !Array.isArray(recipe.steps)) return;
    const pourByTime = new Map((recipe.pours ?? []).map((p) => [p.time_seconds, p.target_water_g]));
    const now = new Date().toISOString();
    sessionStartedAt.current = now;
    startSession({
      recipe_id: recipe.recipe_id,
      bean_id: selectedBeanId ?? null,
      method: selectedMethodId ?? recipe.method,
      started_at: now,
      steps: recipe.steps.map((step, index) => ({
        step_index: index,
        instruction: step.instruction,
        expected_duration_seconds: step.duration_seconds ?? null,
        actual_duration_seconds: null,
        expected_pour_weight_g: pourByTime.get(step.time_seconds) ?? null,
        actual_pour_weight_g: null,
        deviation_note: null,
        confirmed: false,
        completed_at: null,
      })),
    });
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setStepStartAt(Date.now());
    setBrewStartElapsed(null);
    setManualBrewStartElapsed(null);
    setBrewingActive(true);
    setPhase("brewing");
  }

  function handleAdvance() {
    if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
    setAutoAdvancing(false);
    const activeStep = mergedSteps[currentIndex];
    if (!activeStep) return;
    const actualDuration = Math.max(0, Math.floor((Date.now() - stepStartAt) / 1000));
    completeStep(currentIndex, { actual_duration_seconds: actualDuration });

    if (currentIndex >= mergedSteps.length - 1) {
      finalizeSession(elapsedSeconds);
      setBrewingActive(false);

      // Pre-fill confirm state
      const updatedSession = useBrewSessionStore.getState().session;
      const stepTimes = (updatedSession?.steps ?? []).map((step) =>
        formatTimer(step.actual_duration_seconds ?? step.expected_duration_seconds ?? 0)
      );
      setConfirmStepTimes(stepTimes);
      if (recipe) {
        const ep = effectiveParams;
        setConfirmCoffeeG(String(ep?.coffee_g ?? recipe.coffee_g));
        setConfirmWaterMl(String(ep?.water_ml ?? recipe.water_ml));
        setConfirmWaterTempC(String(ep?.water_temp_c ?? recipe.water_temp_c ?? ""));
        const grindVal = ep?.grind_size ?? recipe.grind_size;
        const grind = GRIND_SIZES.find((g) => g.toLowerCase() === grindVal?.toLowerCase()) ?? "Medium";
        setConfirmGrindSize(grind);
      }
      // Default brew time: sum of timed steps, or manual timer if used, or total elapsed
      const defaultBrewSecs = totalTimerSeconds > 0
        ? totalTimerSeconds
        : manualBrewStartElapsed !== null
          ? elapsedSeconds - manualBrewStartElapsed
          : elapsedSeconds;
      setConfirmBrewTime(formatTimer(defaultBrewSecs));
      setConfirmNotes("");
      setSaveError(null);
      setPhase("confirm");
      return;
    }
    setCurrentIndex((i) => i + 1);
  }

  async function handleConfirmSave() {
    if (!recipe) return;
    setSaving(true);
    setSaveError(null);
    try {
      const finalSession = useBrewSessionStore.getState().session;

      let coachFollowed: boolean | null = null;
      let coachSourceBrewId: string | null = null;
      if (isCoachMode && coachBrewRef && coachModifiedParams) {
        coachSourceBrewId = coachBrewRef.id;
        const submittedCoffee = parseFloat(confirmCoffeeG) || recipe.coffee_g;
        const submittedGrind = confirmGrindSize;
        coachFollowed = true;
        if (coachChangeMap.has("coffeeGrams") && Math.abs(submittedCoffee - coachModifiedParams.coffee_g) > coachModifiedParams.coffee_g * 0.1) {
          coachFollowed = false;
        }
        if (coachChangeMap.has("grindSize") && submittedGrind.toLowerCase() !== coachModifiedParams.grind_size?.toLowerCase()) {
          coachFollowed = false;
        }
      }

      const result = await postBrewApi({
        recipe_id: recipe.recipe_id,
        bean_id: selectedBeanId ?? null,
        method_id: selectedMethodId ?? recipe.method,
        brew_type: "guided",
        coffee_grams: parseFloat(confirmCoffeeG) || recipe.coffee_g,
        water_ml: parseFloat(confirmWaterMl) || recipe.water_ml,
        water_temp_c: confirmWaterTempC ? parseFloat(confirmWaterTempC) : (recipe.water_temp_c ?? null),
        grind_size: confirmUseClicks ? recipe.grind_size : confirmGrindSize,
        grinder_name: confirmUseClicks && confirmGrinderName ? confirmGrinderName : null,
        grinder_clicks: confirmUseClicks && confirmGrinderClicks ? parseInt(confirmGrinderClicks, 10) : null,
        brew_time: confirmBrewTime,
        notes: confirmNotes.trim() || null,
        total_brew_time_seconds: parseTimeToSeconds(confirmBrewTime),
        completed_at: new Date().toISOString(),
        steps: (finalSession?.steps ?? []).map((step, i) => ({
          ...step,
          actual_duration_seconds: parseTimeToSeconds(confirmStepTimes[i] ?? "00:00") || step.actual_duration_seconds,
        })),
        ...(coachSourceBrewId ? { coach_source_brew_id: coachSourceBrewId } : {}),
        ...(coachFollowed !== null ? { coach_followed: coachFollowed } : {}),
      });

      const brewId = String((result as Record<string, unknown>).id ?? "");
      await fetchEntries();
      clearSession();
      clearCoachMode();
      setCompletedBrewId(brewId || null);
      setPhase("complete");
    } catch {
      setSaveError("Failed to save brew. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelConfirmed() {
    if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    clearSession();
    setBrewingActive(false);
    setPhase("preview");
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setAutoAdvancing(false);
    setShowCancelConfirm(false);
    sessionStartedAt.current = null;
  }

  // ─── Loading / error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading recipe…</p>
      </main>
    );
  }

  if (hasError || !recipe) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <span className="material-symbols-outlined text-5xl text-primary/40">error</span>
        <h1 className="text-xl font-bold text-slate-100 text-center">Could not load this recipe</h1>
        <Link href="/log-brew/guided" className="inline-flex items-center gap-2 text-sm font-bold text-primary">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to recipes
        </Link>
      </main>
    );
  }

  // ─── Complete screen ───────────────────────────────────────────────────────

  if (phase === "complete") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mb-2">
          <span className="material-symbols-outlined text-5xl text-primary">check_circle</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-100">Brew Complete!</h1>
        <p className="font-mono text-xl text-primary">{confirmBrewTime}</p>
        <p className="text-sm text-slate-400">Great work. Enjoy your cup.</p>

        {completedBrewId && (
          <button
            type="button"
            onClick={() => router.push(`/coach/brew/${completedBrewId}`)}
            className="w-full max-w-xs bg-primary text-background-dark font-bold py-4 rounded-xl flex items-center justify-center gap-2 mt-4 hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined">psychology</span>
            How was that brew?
          </button>
        )}
      </main>
    );
  }

  // ─── Confirm screen ────────────────────────────────────────────────────────

  if (phase === "confirm") {
    const isColdBrew = recipe.method === "cold_brew";
    return (
      <>
        <main className="flex-1 overflow-y-auto pb-44">
          {/* Minimal header */}
          <header className="sticky top-0 z-40 bg-background-dark/90 backdrop-blur-md border-b border-primary/10 px-4 py-4">
            <h2 className="text-base font-bold text-slate-100 text-center">Confirm Your Brew</h2>
          </header>

          <div className="p-4 space-y-6">
            {/* Steps section */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
                Step Timings — edit if you deviated
              </p>
              <div className="space-y-3">
                {mergedSteps.map((step, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
                    <div className="size-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <p className="flex-1 text-sm text-slate-300 leading-snug">{resolveInstructionMath(step.instruction)}</p>
                    {step.duration_seconds !== null ? (
                      <input
                        type="text"
                        value={confirmStepTimes[i] ?? "00:00"}
                        onChange={(e) => {
                          const next = [...confirmStepTimes];
                          next[i] = e.target.value;
                          setConfirmStepTimes(next);
                        }}
                        placeholder="mm:ss"
                        className="w-16 h-8 rounded-lg bg-white/5 border border-white/10 px-2 text-xs text-slate-100 text-center outline-none focus:border-primary/50 shrink-0"
                      />
                    ) : (
                      <span className="text-xs text-slate-500 shrink-0">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Overall brew parameters */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Brew Parameters</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Coffee (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={confirmCoffeeG}
                      onChange={(e) => setConfirmCoffeeG(e.target.value)}
                      className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-slate-100 outline-none focus:border-primary/50"
                    />
                    {coachChangeMap.has("coffeeGrams") && (
                      <CoachHintInline label={coachChangeMap.get("coffeeGrams")!.suggestion} param="coffeeGrams" />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Water (ml)</label>
                    <input
                      type="number"
                      step="1"
                      value={confirmWaterMl}
                      onChange={(e) => setConfirmWaterMl(e.target.value)}
                      className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-slate-100 outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                {!isColdBrew && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Water Temperature (°C)</label>
                    <input
                      type="number"
                      step="1"
                      value={confirmWaterTempC}
                      onChange={(e) => setConfirmWaterTempC(e.target.value)}
                      className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-slate-100 outline-none focus:border-primary/50"
                    />
                    {coachChangeMap.has("waterTempC") && (
                      <CoachHintInline label={coachChangeMap.get("waterTempC")!.suggestion} param="waterTempC" />
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {confirmUseClicks ? "Clicks" : "Grind Size"}
                    </label>
                    {confirmGrinderName && (
                      <button
                        type="button"
                        onClick={() => setConfirmUseClicks((v) => !v)}
                        className="text-[9px] font-semibold text-primary/60 hover:text-primary uppercase tracking-wider"
                      >
                        {confirmUseClicks ? "Use size" : "Use clicks"}
                      </button>
                    )}
                  </div>
                  {confirmUseClicks && confirmGrinderName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        placeholder="Clicks"
                        value={confirmGrinderClicks}
                        onChange={(e) => setConfirmGrinderClicks(e.target.value)}
                        className="flex-1 h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-slate-100 outline-none focus:border-primary/50"
                      />
                      <span className="text-[10px] text-slate-500 shrink-0">{confirmGrinderName}</span>
                    </div>
                  ) : (
                    <select
                      value={confirmGrindSize}
                      onChange={(e) => setConfirmGrindSize(e.target.value as typeof GRIND_SIZES[number])}
                      className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-slate-100 outline-none focus:border-primary/50"
                    >
                      {GRIND_SIZES.map((s) => (
                        <option key={s} value={s} className="bg-[#1a0f00]">{s}</option>
                      ))}
                    </select>
                  )}
                  {coachChangeMap.has("grindSize") && (
                    <CoachHintInline label={coachChangeMap.get("grindSize")!.suggestion} param="grindSize" />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Total Brew Time</label>
                  <BrewTimePicker value={confirmBrewTime} onChange={setConfirmBrewTime} coldBrew={isColdBrew} />
                  {coachChangeMap.has("brewTime") && (
                    <CoachHintInline label={coachChangeMap.get("brewTime")!.suggestion} param="brewTime" />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Notes</label>
                  <textarea
                    rows={3}
                    value={confirmNotes}
                    onChange={(e) => setConfirmNotes(e.target.value)}
                    placeholder="Any observations about this brew..."
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-primary/50 resize-none"
                  />
                </div>
              </div>
            </div>

            {saveError && <p className="text-xs text-red-400">{saveError}</p>}
          </div>
        </main>

        {/* Sticky save button */}
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40 max-w-phone mx-auto">
          <button
            type="button"
            onClick={handleConfirmSave}
            disabled={saving}
            className="w-full bg-primary text-background-dark font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            {saving ? (
              "Saving…"
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
                Save Brew
              </>
            )}
          </button>
        </div>
      </>
    );
  }

  // ─── Main page ─────────────────────────────────────────────────────────────

  const isBrewing = phase === "brewing";
  const progressPct = hasTimedSteps
    ? Math.min(100, (brewElapsed / totalTimerSeconds) * 100)
    : manualBrewStartElapsed !== null
      ? Math.min(100, (manualElapsed / 300) * 100) // 5-min soft cap for visual fill
      : 0;

  return (
    <>
      {/* ── Sticky page header ── */}
      <header className="sticky top-0 z-40 bg-background-dark/90 backdrop-blur-md border-b border-primary/10">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <button
            type="button"
            onClick={() => isBrewing ? setShowCancelConfirm(true) : router.back()}
            className="flex items-center justify-center size-10 rounded-full hover:bg-primary/10 transition-colors"
            aria-label={isBrewing ? "Cancel brew" : "Go back"}
          >
            <span className="material-symbols-outlined text-slate-100">arrow_back</span>
          </button>
          <h2 className="text-base font-bold text-slate-100 text-center flex-1 px-2">{methodDisplayName(recipe.method)}</h2>
          <div className="size-10" />
        </div>

        {/* Brewing progress bar — hidden for cold brew, otherwise slides in when brewing starts */}
        {!isColdBrew && (
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isBrewing ? "max-h-16 opacity-100 pb-3 px-4" : "max-h-0 opacity-0"}`}>
            <div className="flex justify-between items-center mb-1.5">
              <p className="text-xs font-medium text-slate-400">Brewing Progress</p>
              {hasTimedSteps ? (
                <p className="text-xs font-bold text-primary">
                  {formatTimer(brewElapsed)} / {formatTimer(totalTimerSeconds)}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-primary">{formatTimer(manualElapsed)}</p>
                  {manualBrewStartElapsed === null && (
                    <button
                      type="button"
                      onClick={() => setManualBrewStartElapsed(elapsedSeconds)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                    >
                      Start
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="h-2 w-full rounded-full bg-primary/20 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* ── Scrollable content ── */}
      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-56">
        <div className="p-4">

          {/* === COLLAPSIBLE: Recipe info + Image + Brew params === */}
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isBrewing ? "max-h-0 opacity-0" : "max-h-[1200px] opacity-100"}`}>

            {/* Recipe title */}
            <h1 className="font-serif text-2xl font-bold text-slate-100 mb-4">{recipe.title}</h1>

            {/* Coach mode banner with merged advice */}
            {isCoachMode && (
              <div className="mb-5 rounded-xl bg-primary/5 border border-primary/20 overflow-hidden flex items-stretch">
                <div className="w-28 shrink-0 relative self-stretch">
                  <Image
                    src="/coach/img3_whistle_blowing.png"
                    alt="Coach"
                    fill
                    className="object-cover object-top"
                  />
                </div>
                <div className="flex-1 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">Coach&apos;s Adjusted Recipe</p>
                  {coachChanges && coachChanges.filter((c) => c.suggestion).length > 0 && (
                    <p className="text-sm text-slate-200 leading-relaxed mb-1">
                      Coach asked you to {coachChanges.filter((c) => c.suggestion).map((c) => c.suggestion?.toLowerCase()).join(", ")}.
                    </p>
                  )}
                  <p className="text-xs text-slate-400">Parameters have been adjusted based on your last brew.</p>
                </div>
              </div>
            )}

            {/* Method image + Brew params side by side */}
            <div className="flex gap-4 mb-6">
              {/* Method image */}
              <div className="w-1/3 shrink-0">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-background-dark border border-primary/10">
                  <Image
                    src={`/methods/${methodImage(recipe.method)}`}
                    alt={methodDisplayName(recipe.method)}
                    fill
                    className="object-contain p-3"
                  />
                </div>
              </div>

              {/* Params in 2-column grid */}
              <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-2 content-center">
                {(() => {
                  const grindChange = coachChangeMap.get("grindSize");
                  const hasGrinderClicks = coachModifiedParams?.grinder_clicks != null;
                  const grindValue = hasGrinderClicks
                    ? `${coachModifiedParams!.grinder_clicks} clicks`
                    : effectiveParams?.grind_size ?? recipe.grind_size ?? "—";
                  const grindOriginalValue = hasGrinderClicks
                    ? (grindChange?.previousValue != null
                        ? `${grindChange.previousValue} clicks`
                        : coachBrewRef?.grinderClicks != null
                          ? `${coachBrewRef.grinderClicks} clicks`
                          : recipe.grind_size)
                    : recipe.grind_size;
                  return [
                    { icon: "scale", label: "Coffee", paramKey: "coffeeGrams", value: `${effectiveParams?.coffee_g ?? recipe.coffee_g}g`, originalValue: `${recipe.coffee_g}g` },
                    { icon: "water_drop", label: "Water", paramKey: null, value: `${effectiveParams?.water_ml ?? recipe.water_ml}ml`, originalValue: null },
                    { icon: "thermostat", label: "Temp", paramKey: "waterTempC", value: `${effectiveParams?.water_temp_c ?? recipe.water_temp_c ?? "—"}°C`, originalValue: recipe.water_temp_c ? `${recipe.water_temp_c}°C` : null },
                    { icon: "timer", label: "Time", paramKey: "brewTime", value: formatTimer(effectiveParams?.brew_time_seconds ?? recipe.brew_time_seconds), originalValue: formatTimer(recipe.brew_time_seconds) },
                    { icon: "grain", label: "Grind", paramKey: "grindSize", value: grindValue, originalValue: grindOriginalValue },
                  ];
                })().map(({ icon, label, paramKey, value, originalValue }) => {
                  const hasChange = paramKey ? coachChangeMap.has(paramKey) : false;
                  return (
                    <div key={label} className={`flex items-center gap-2 py-1.5 ${hasChange ? "bg-primary/5 px-1.5 rounded-lg" : ""}`}>
                      <div className={`size-6 rounded-full flex items-center justify-center shrink-0 ${hasChange ? "bg-primary/20" : "bg-white/10"}`}>
                        <span className={`material-symbols-outlined ${hasChange ? "text-primary" : "text-slate-400"}`} style={{ fontSize: "14px" }}>{icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${hasChange ? "text-primary/70" : "text-slate-500"}`}>{label}</p>
                        <p className="text-xs font-bold text-slate-100">
                          {hasChange && originalValue && originalValue !== value && (
                            <span className="line-through text-slate-500 text-[10px] mr-1">{originalValue}</span>
                          )}
                          {value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* === STEPS — always visible === */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                {isBrewing ? "Steps" : "Steps Preview"}
              </h3>
              <span className="text-xs font-medium text-slate-500">{mergedSteps.length} Steps</span>
            </div>

            <div className="flex flex-col gap-3">
              {mergedSteps.map((step, index) => {
                const isPast = isBrewing && index < currentIndex;
                const isCurrent = isBrewing && index === currentIndex;
                const isFuture = isBrewing && index > currentIndex;
                const stepCountdown = isCurrent && step.duration_seconds ? countdownRemaining : null;

                return (
                  <div
                    key={`${step.time_seconds}-${index}`}
                    ref={isCurrent ? currentStepRef : null}
                    className={`relative rounded-xl border flex gap-4 items-start p-4 transition-all duration-300 ${
                      isCurrent
                        ? "bg-primary/10 border-primary/30"
                        : isPast
                        ? "bg-white/3 border-white/5 opacity-40"
                        : isFuture
                        ? "bg-white/5 border-white/5 opacity-60"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    {/* Step number bubble */}
                    <div className={`size-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all duration-300 ${
                      isCurrent
                        ? "bg-primary text-background-dark"
                        : isPast
                        ? "bg-primary/30 text-primary"
                        : "bg-white/15 text-slate-400"
                    }`}>
                      {isPast
                        ? <span className="material-symbols-outlined text-sm">check</span>
                        : index + 1
                      }
                    </div>

                    {/* Step body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-sm leading-snug ${isCurrent ? "font-medium text-slate-100" : "font-medium text-slate-300"}`}>
                          {resolveInstructionMath(step.instruction)}
                        </p>
                        {step.duration_seconds && (
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCurrent ? "bg-primary/20 text-primary" : "bg-white/10 text-slate-500"
                          }`}>
                            {formatTimer(step.duration_seconds)}
                          </span>
                        )}
                      </div>

                      {/* Water amount badge */}
                      {step.target_water_g !== null && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/10 px-2 py-1 rounded mt-1">
                          <span className="material-symbols-outlined text-xs">water_drop</span>
                          {step.target_water_g}g
                        </span>
                      )}

                      {/* Countdown bar — current step only */}
                      {isCurrent && step.duration_seconds && stepCountdown !== null && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-mono text-2xl font-bold text-primary">
                              {formatTimer(stepCountdown)}
                            </p>
                            <button
                              type="button"
                              onClick={handleAdvance}
                              className="text-xs font-bold text-slate-400 hover:text-slate-200 px-3 py-1 rounded-full border border-white/10 hover:border-white/30 transition-colors"
                            >
                              Skip
                            </button>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-primary/20 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(0, (stepCountdown / step.duration_seconds) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* ── Bottom action button ── */}
      <div className={`fixed z-40 left-0 right-0 max-w-phone mx-auto transition-all duration-300 ease-in-out ${
        isBrewing ? "bottom-6 px-4 flex flex-col items-center gap-2" : "bottom-36 px-4"
      }`}>
        {isBrewing ? (
          <>
            <button
              type="button"
              onClick={handleAdvance}
              disabled={currentStep?.duration_seconds != null && countdownRemaining !== null && countdownRemaining > 0}
              className="w-full bg-primary text-background-dark font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                {currentIndex >= mergedSteps.length - 1 ? "check_circle" : "arrow_forward"}
              </span>
              {currentIndex >= mergedSteps.length - 1 ? "Finish Brew" : "Next Step"}
            </button>
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Cancel Brew
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={mergedSteps.length === 0}
            className="w-full bg-primary text-background-dark font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              play_arrow
            </span>
            Start Brewing
          </button>
        )}
      </div>

      {/* ── Cancel confirmation overlay ── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background-dark/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-primary/20 bg-[#2a1d11] p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary">warning</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-1">Cancel brew?</h2>
            <p className="text-sm text-slate-400 mb-6">Your brewing progress will be lost.</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="w-full bg-primary text-background-dark font-bold py-3 rounded-xl hover:brightness-110 transition-all"
              >
                Keep Brewing
              </button>
              <button
                type="button"
                onClick={handleCancelConfirmed}
                className="w-full border border-slate-600 text-slate-400 font-medium py-3 rounded-xl hover:text-slate-200 hover:border-slate-400 transition-colors"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
