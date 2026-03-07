"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getRecipeByIdApi, postBrewApi, type GuidedRecipe } from "@/lib/api";
import { useBrewSessionStore } from "@/lib/brewSessionStore";

type MergedStep = {
  time_seconds: number;
  instruction: string;
  duration_seconds: number | null;
  target_water_g: number | null;
};

function formatTimer(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function GuidedBrewPage() {
  const params = useParams<{ id: string }>();
  const session = useBrewSessionStore((state) => state.session);
  const startSession = useBrewSessionStore((state) => state.startSession);
  const completeStep = useBrewSessionStore((state) => state.completeStep);
  const finalizeSession = useBrewSessionStore((state) => state.finalizeSession);

  const [recipe, setRecipe] = useState<GuidedRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stepStartAt, setStepStartAt] = useState<number>(Date.now());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const [showTweak, setShowTweak] = useState(false);
  const [tweakValue, setTweakValue] = useState("");
  const [complete, setComplete] = useState(false);

  const autoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await getRecipeByIdApi(params.id);
        if (!mounted) {
          return;
        }

        if (!data || !Array.isArray(data.steps)) {
          setHasError(true);
          return;
        }

        setRecipe(data);

        if (!session || session.recipe_id !== data.recipe_id) {
          const pourByTime = new Map((data.pours ?? []).map((pour) => [pour.time_seconds, pour.target_water_g]));
          startSession({
            recipe_id: data.recipe_id,
            bean_id: null,
            method: data.method,
            started_at: new Date().toISOString(),
            steps: data.steps.map((step, index) => ({
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
        }
      } catch {
        if (mounted) {
          setHasError(true);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
      if (autoTimeoutRef.current) {
        clearTimeout(autoTimeoutRef.current);
      }
    };
  }, [params.id, session, startSession]);

  const mergedSteps = useMemo<MergedStep[]>(() => {
    if (!recipe || !Array.isArray(recipe.steps)) {
      return [];
    }

    const pourByTime = new Map((recipe.pours ?? []).map((pour) => [pour.time_seconds, pour.target_water_g]));
    return recipe.steps.map((step) => ({
      time_seconds: step.time_seconds,
      instruction: step.instruction,
      duration_seconds: step.duration_seconds ?? null,
      target_water_g: pourByTime.get(step.time_seconds) ?? null,
    }));
  }, [recipe]);

  const currentStep = mergedSteps[currentIndex] ?? null;

  useEffect(() => {
    if (!session?.started_at || complete) {
      return;
    }

    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000));
      setElapsedSeconds(diff);
    }, 250);

    return () => clearInterval(timer);
  }, [complete, session?.started_at]);

  const countdownRemaining = useMemo(() => {
    if (!currentStep?.duration_seconds) {
      return null;
    }
    const elapsedInStep = Math.floor((Date.now() - stepStartAt) / 1000);
    return Math.max(0, currentStep.duration_seconds - elapsedInStep);
  }, [currentStep?.duration_seconds, stepStartAt, elapsedSeconds]);

  useEffect(() => {
    if (!currentStep?.duration_seconds || autoAdvancing || complete) {
      return;
    }

    if (countdownRemaining !== null && countdownRemaining <= 0) {
      setAutoAdvancing(true);
      setToastMessage("Next step starting...");
      autoTimeoutRef.current = setTimeout(() => {
        handleAdvance();
        setAutoAdvancing(false);
        setToastMessage(null);
      }, 2400);
    }
  }, [autoAdvancing, complete, countdownRemaining, currentStep?.duration_seconds]);

  useEffect(() => {
    setStepStartAt(Date.now());
    setShowTweak(false);
    setTweakValue("");
  }, [currentIndex]);

  function handleAdvance(payload?: {
    actual_duration_seconds?: number | null;
    actual_pour_weight_g?: number | null;
    deviation_note?: string | null;
  }) {
    const activeStep = mergedSteps[currentIndex];
    if (!activeStep) {
      return;
    }

    const actualDuration = Math.max(0, Math.floor((Date.now() - stepStartAt) / 1000));
    completeStep(currentIndex, {
      actual_duration_seconds: payload?.actual_duration_seconds ?? actualDuration,
      actual_pour_weight_g: payload?.actual_pour_weight_g ?? null,
      deviation_note: payload?.deviation_note ?? null,
    });

    if (currentIndex >= mergedSteps.length - 1) {
      finalizeSession(elapsedSeconds);
      void postBrewApi({
        recipe_id: session?.recipe_id ?? params.id,
        total_brew_time_seconds: elapsedSeconds,
        completed_at: new Date().toISOString(),
        steps: session?.steps ?? [],
      });
      setComplete(true);
      return;
    }

    setCurrentIndex((idx) => idx + 1);
  }

  function initializeTweakValue() {
    if (!currentStep) {
      setTweakValue("");
      return;
    }
    if (currentStep.target_water_g !== null) {
      setTweakValue(String(currentStep.target_water_g));
      return;
    }
    if (currentStep.duration_seconds !== null) {
      setTweakValue(String(currentStep.duration_seconds));
      return;
    }
    setTweakValue("");
  }

  function saveTweakAndContinue() {
    if (!currentStep) {
      return;
    }

    if (currentStep.target_water_g !== null) {
      handleAdvance({
        actual_pour_weight_g: Number(tweakValue) || null,
      });
      return;
    }
    if (currentStep.duration_seconds !== null) {
      handleAdvance({
        actual_duration_seconds: Number(tweakValue) || null,
      });
      return;
    }
    handleAdvance({
      deviation_note: tweakValue.trim() || null,
    });
  }

  const tweaksSummary = (session?.steps ?? []).filter(
    (step) =>
      step.deviation_note ||
      (step.actual_duration_seconds !== null &&
        step.expected_duration_seconds !== null &&
        step.actual_duration_seconds !== step.expected_duration_seconds) ||
      (step.actual_pour_weight_g !== null &&
        step.expected_pour_weight_g !== null &&
        step.actual_pour_weight_g !== step.expected_pour_weight_g),
  );

  if (isLoading) {
    return <p className="text-sm text-mocha/80">Loading brew guide...</p>;
  }

  if (hasError || !recipe || !Array.isArray(recipe.steps)) {
    return (
      <section className="space-y-4 rounded-3xl border border-mocha/10 bg-steam p-5 shadow-card">
        <h1 className="font-serif text-3xl font-bold text-espresso">Could not load this recipe</h1>
        <p className="text-sm text-mocha/80">Please go back and choose another recipe.</p>
        <Button asChild>
          <Link href="/log-brew/guided">Back</Link>
        </Button>
      </section>
    );
  }

  if (complete) {
    return (
      <section className="space-y-4 rounded-3xl border border-mocha/10 bg-steam p-5 shadow-card">
        <h1 className="font-serif text-4xl font-bold text-espresso">Brew Complete!</h1>
        <p className="font-mono text-2xl text-mocha">Total Time: {formatTimer(elapsedSeconds)}</p>

        <div className="rounded-2xl bg-latte/40 p-3">
          <p className="text-sm font-semibold text-espresso">Tweaks Summary</p>
          {tweaksSummary.length === 0 ? (
            <p className="mt-1 text-sm text-mocha/80">No tweaks recorded. Nice and consistent brew.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-mocha">
              {tweaksSummary.map((step) => (
                <li key={step.step_index} className="rounded-lg bg-steam px-2 py-1">
                  Step {step.step_index + 1}: {step.deviation_note ?? "Adjusted pour/time"}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button asChild className="h-12 w-full text-base">
          <Link href="/">Rate Your Brew</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-mocha/10 bg-steam px-4 py-3 shadow-card">
        <p className="font-mono text-4xl font-bold text-espresso">{formatTimer(elapsedSeconds)}</p>
        <p className="mt-1 text-sm text-mocha/75">
          Step {currentIndex + 1} of {mergedSteps.length}
        </p>
      </div>

      <div key={currentIndex} className="animate-slide-in rounded-3xl border border-mocha/10 bg-steam p-5 shadow-card">
        {currentStep?.target_water_g !== null ? (
          <p className="mb-2 font-serif text-3xl font-bold text-mocha">Target: {currentStep.target_water_g}g</p>
        ) : null}
        <p className="text-xl leading-8 text-espresso">{currentStep?.instruction}</p>

        {currentStep?.duration_seconds !== null ? (
          <div className="mt-4">
            <p className="font-mono text-3xl text-charcoal">{formatTimer(countdownRemaining ?? 0)}</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-latte/50">
              <div
                className="h-full bg-mocha transition-all duration-500"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      ((countdownRemaining ?? 0) / Math.max(1, currentStep.duration_seconds)) * 100,
                    ),
                  )}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        {showTweak ? (
          <div className="mt-4 space-y-2 rounded-xl bg-latte/30 p-3">
            <input
              value={tweakValue}
              onChange={(event) => setTweakValue(event.target.value)}
              type={currentStep?.target_water_g !== null || currentStep?.duration_seconds !== null ? "number" : "text"}
              placeholder={
                currentStep?.target_water_g !== null
                  ? "Target weight (g)"
                  : currentStep?.duration_seconds !== null
                    ? "Duration (seconds)"
                    : "What did you do differently?"
              }
              className="h-10 w-full rounded-xl border border-mocha/20 bg-steam px-3 text-sm text-espresso outline-none focus:ring-2 focus:ring-mocha/40"
            />
            <Button size="sm" onClick={saveTweakAndContinue}>
              Save & Continue
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button className="h-12" onClick={() => handleAdvance()} disabled={autoAdvancing}>
          Done
        </Button>
        <Button
          variant="ghost"
          className="h-12 border border-mocha/20 bg-cream"
          onClick={() => {
            setShowTweak(true);
            initializeTweakValue();
          }}
          disabled={autoAdvancing}
        >
          Tweak
        </Button>
      </div>

      {toastMessage ? (
        <div className="rounded-xl border border-mocha/20 bg-latte/50 px-3 py-2 text-sm text-mocha animate-pulse-soft">
          {toastMessage}
        </div>
      ) : null}
    </section>
  );
}
