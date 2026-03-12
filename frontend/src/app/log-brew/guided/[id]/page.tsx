"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { getRecipeByIdApi, postBrewApi, type GuidedRecipe } from "@/lib/api";
import { useBrewSessionStore } from "@/lib/brewSessionStore";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";
import { useLogBrewStore } from "@/lib/logBrewStore";
import { BrewRatingSheet } from "@/components/BrewRatingSheet";
import { BrewTimePicker } from "@/components/BrewTimePicker";

type Phase = "preview" | "brewing" | "confirm" | "complete";

type MergedStep = {
  time_seconds: number;
  instruction: string;
  duration_seconds: number | null;
  target_water_g: number | null;
};

const GRIND_SIZES = [
  "Extra Fine",
  "Fine",
  "Medium-Fine",
  "Medium",
  "Medium-Coarse",
  "Coarse",
] as const;

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

  const [recipe, setRecipe] = useState<GuidedRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [phase, setPhase] = useState<Phase>("preview");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stepStartAt, setStepStartAt] = useState<number>(Date.now());
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Confirm phase state
  const [confirmCoffeeG, setConfirmCoffeeG] = useState("");
  const [confirmWaterMl, setConfirmWaterMl] = useState("");
  const [confirmWaterTempC, setConfirmWaterTempC] = useState("");
  const [confirmGrindSize, setConfirmGrindSize] = useState<typeof GRIND_SIZES[number]>("Medium");
  const [confirmBrewTime, setConfirmBrewTime] = useState("00:00");
  const [confirmNotes, setConfirmNotes] = useState("");
  const [confirmStepTimes, setConfirmStepTimes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Complete phase state
  const [completedBrewId, setCompletedBrewId] = useState<string | null>(null);
  const [showRatingSheet, setShowRatingSheet] = useState(false);

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
            setConfirmCoffeeG(String(data.coffee_g));
            setConfirmWaterMl(String(data.water_ml));
            setConfirmWaterTempC(String(data.water_temp_c ?? ""));
            const grind = GRIND_SIZES.find((g) => g.toLowerCase() === data.grind_size?.toLowerCase()) ?? "Medium";
            setConfirmGrindSize(grind);
            setConfirmBrewTime(formatTimer(existingSession.total_brew_time_seconds));
            setPhase("confirm");
          } else {
            // Restore brewing phase
            const diff = Math.max(0, Math.floor((Date.now() - new Date(existingSession.started_at).getTime()) / 1000));
            setElapsedSeconds(diff);
            setCurrentIndex(completedCount);
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
    }));
  }, [recipe]);

  // Total of only timed steps — used for the brew timer progress bar
  const totalTimerSeconds = useMemo(
    () => mergedSteps.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0),
    [mergedSteps],
  );

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
        setConfirmCoffeeG(String(recipe.coffee_g));
        setConfirmWaterMl(String(recipe.water_ml));
        setConfirmWaterTempC(String(recipe.water_temp_c ?? ""));
        const grind = GRIND_SIZES.find((g) => g.toLowerCase() === recipe.grind_size?.toLowerCase()) ?? "Medium";
        setConfirmGrindSize(grind);
      }
      setConfirmBrewTime(formatTimer(elapsedSeconds));
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
      const result = await postBrewApi({
        recipe_id: recipe.recipe_id,
        bean_id: selectedBeanId ?? null,
        method_id: selectedMethodId ?? recipe.method,
        brew_type: "guided",
        coffee_grams: parseFloat(confirmCoffeeG) || recipe.coffee_g,
        water_ml: parseFloat(confirmWaterMl) || recipe.water_ml,
        water_temp_c: confirmWaterTempC ? parseFloat(confirmWaterTempC) : (recipe.water_temp_c ?? null),
        grind_size: confirmGrindSize,
        brew_time: confirmBrewTime,
        notes: confirmNotes.trim() || null,
        total_brew_time_seconds: parseTimeToSeconds(confirmBrewTime),
        completed_at: new Date().toISOString(),
        steps: (finalSession?.steps ?? []).map((step, i) => ({
          ...step,
          actual_duration_seconds: parseTimeToSeconds(confirmStepTimes[i] ?? "00:00") || step.actual_duration_seconds,
        })),
      });

      const brewId = String((result as Record<string, unknown>).id ?? "");
      await fetchEntries();
      clearSession();
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
      <>
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
              onClick={() => setShowRatingSheet(true)}
              className="w-full max-w-xs bg-primary text-background-dark font-bold py-4 rounded-xl flex items-center justify-center gap-2 mt-4 hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined">psychology</span>
              How was that brew?
            </button>
          )}

        </main>

        {completedBrewId && (
          <BrewRatingSheet
            brewId={completedBrewId}
            open={showRatingSheet}
            onOpenChange={setShowRatingSheet}
          />
        )}
      </>
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
                    <p className="flex-1 text-sm text-slate-300 leading-snug">{step.instruction}</p>
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
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Grind Size</label>
                  <select
                    value={confirmGrindSize}
                    onChange={(e) => setConfirmGrindSize(e.target.value as typeof GRIND_SIZES[number])}
                    className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-slate-100 outline-none focus:border-primary/50"
                  >
                    {GRIND_SIZES.map((s) => (
                      <option key={s} value={s} className="bg-[#1a0f00]">{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Total Brew Time</label>
                  <BrewTimePicker value={confirmBrewTime} onChange={setConfirmBrewTime} />
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
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
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
  const progressPct = totalTimerSeconds > 0
    ? Math.min(100, (elapsedSeconds / totalTimerSeconds) * 100)
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
          <div className="flex flex-col items-center text-center flex-1 px-2">
            <h2 className="text-base font-bold text-slate-100 leading-tight line-clamp-1">{recipe.title}</h2>
            <p className="text-xs text-primary font-medium">{recipe.author}</p>
          </div>
          <div className="size-10" />
        </div>

        {/* Brewing progress bar — slides in when brewing starts */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isBrewing ? "max-h-16 opacity-100 pb-3 px-4" : "max-h-0 opacity-0"}`}>
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-xs font-medium text-slate-400">Brewing Progress</p>
            <p className="text-xs font-bold text-primary">
              {formatTimer(elapsedSeconds)} / {formatTimer(totalTimerSeconds)}
            </p>
          </div>
          <div className="h-2 w-full rounded-full bg-primary/20 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-36">
        <div className="p-4">

          {/* === COLLAPSIBLE: Image placeholder + Brew params === */}
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isBrewing ? "max-h-0 opacity-0" : "max-h-[700px] opacity-100"}`}>

            {/* Method image placeholder */}
            <div className="relative overflow-hidden rounded-xl aspect-[16/9] mb-6 bg-gradient-to-br from-primary/20 via-primary/5 to-background-dark border border-primary/10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 to-transparent" />
              <span className="material-symbols-outlined text-primary/20 z-0" style={{ fontSize: "7rem" }}>
                {methodIcon(recipe.method)}
              </span>
              <div className="absolute bottom-4 left-4 z-10">
                <span className="px-2 py-1 bg-primary text-background-dark text-[10px] font-bold uppercase tracking-widest rounded mb-2 inline-block">
                  {recipe.method.replace(/_/g, " ")}
                </span>
                <h1 className="text-2xl font-bold text-white">{recipe.title}</h1>
              </div>
            </div>

            {/* Brew Parameters */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Brew Parameters</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "scale", label: "Coffee", value: `${recipe.coffee_g}g` },
                  { icon: "water_drop", label: "Water", value: `${recipe.water_ml}ml` },
                  { icon: "thermostat", label: "Temp", value: `${recipe.water_temp_c}°C` },
                  { icon: "shutter_speed", label: "Time", value: formatTimer(recipe.brew_time_seconds) },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="bg-primary/10 p-4 rounded-xl border border-primary/10 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-primary">
                      <span className="material-symbols-outlined text-sm">{icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
                    </div>
                    <p className="text-xl font-bold text-slate-100">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 bg-primary/10 p-4 rounded-xl border border-primary/10 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">grain</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-tighter text-primary">Grind Size</p>
                  <p className="text-sm font-bold text-slate-100">{recipe.grind_size}</p>
                </div>
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
                        <p className={`text-sm leading-snug ${isCurrent ? "font-bold text-slate-100" : "font-medium text-slate-300"}`}>
                          {step.instruction}
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
      <div className={`fixed z-40 left-0 right-0 transition-all duration-300 ease-in-out ${
        isBrewing ? "bottom-6 px-4 flex flex-col items-center gap-2" : "bottom-20 px-4"
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
