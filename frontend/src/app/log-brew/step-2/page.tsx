"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useBrewHistoryStore } from "@/lib/brewHistoryStore";
import { useBeansStore } from "@/lib/beansStore";
import { useLogBrewStore } from "@/lib/logBrewStore";

type Choice = "coach" | "guided" | "freestyle";

function toRecipeMethodKey(selectedMethodId: string | null, selectedPourOverDeviceId: string | null) {
  if (!selectedMethodId) {
    return null;
  }

  if (selectedMethodId === "pour_over") {
    return selectedPourOverDeviceId ?? "v60";
  }

  return selectedMethodId;
}

function prettyMethodName(methodKey: string | null) {
  if (!methodKey) {
    return "selected method";
  }

  switch (methodKey) {
    case "v60":
      return "V60";
    case "chemex":
      return "Chemex";
    case "kalita_wave":
      return "Kalita Wave";
    case "clever_dripper":
      return "Clever Dripper";
    case "hario_switch":
      return "Hario Switch";
    case "wilfa_pour_over":
      return "Wilfa Pour Over";
    case "origami_dripper":
      return "Origami Dripper";
    case "aeropress":
      return "AeroPress";
    case "french_press":
      return "French Press";
    case "moka_pot":
      return "Moka Pot";
    case "cold_brew":
      return "Cold Brew";
    case "south_indian_filter":
      return "Filter Kaapi";
    default:
      return methodKey.replace(/_/g, " ");
  }
}

export default function LogBrewStepTwoPage() {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice | null>(null);
  const selectedBeanId = useLogBrewStore((state) => state.selectedBeanId);
  const selectedMethodId = useLogBrewStore((state) => state.selectedMethodId);
  const selectedPourOverDeviceId = useLogBrewStore((state) => state.selectedPourOverDeviceId);
  const setCoachMode = useLogBrewStore((state) => state.setCoachMode);

  const userBeans = useBeansStore((state) => state.userBeans);
  const selectedBean = userBeans.find((b) => b.id === selectedBeanId);

  const entries = useBrewHistoryStore((state) => state.entries);
  const fetchEntries = useBrewHistoryStore((state) => state.fetchEntries);

  // Ensure brew history is loaded (needed for coach card on fresh page load)
  useEffect(() => {
    if (entries.length === 0) fetchEntries();
  }, [entries.length, fetchEntries]);

  const effectiveMethodId = useMemo(() => {
    if (selectedMethodId === "pour_over") {
      return selectedPourOverDeviceId ?? selectedMethodId;
    }
    return selectedMethodId;
  }, [selectedMethodId, selectedPourOverDeviceId]);

  // Find most recent brew for same bean+method combo that has coaching feedback
  const coachedBrew = useMemo(() => {
    if (!selectedBeanId || !effectiveMethodId) return null;
    const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted.find(
      (e) =>
        e.beanId === selectedBeanId &&
        e.methodId === effectiveMethodId &&
        !!e.coachingFeedback,
    ) ?? null;
  }, [entries, selectedBeanId, effectiveMethodId]);

  const recipeMethodKey = useMemo(
    () => toRecipeMethodKey(selectedMethodId, selectedPourOverDeviceId),
    [selectedMethodId, selectedPourOverDeviceId],
  );

  const [recipeCount, setRecipeCount] = useState(0);

  useEffect(() => {
    if (!recipeMethodKey) {
      setRecipeCount(0);
      return;
    }
    fetch(`/api/recipes?method=${recipeMethodKey}`)
      .then((res) => res.json())
      .then((data) => setRecipeCount(data.recipes?.length ?? 0))
      .catch(() => setRecipeCount(0));
  }, [recipeMethodKey]);

  function handleNext() {
    if (!choice) {
      return;
    }

    if (choice === "coach" && coachedBrew) {
      setCoachMode(coachedBrew, coachedBrew.coachingChanges ?? [], coachedBrew.recipeId);
      if (coachedBrew.recipeId && coachedBrew.brewType === "guided") {
        router.push(`/log-brew/guided/${coachedBrew.recipeId}`);
      } else {
        router.push("/log-brew/freestyle");
      }
      return;
    }

    router.push(choice === "guided" ? "/log-brew/guided" : "/log-brew/freestyle");
  }

  return (
    <main className="relative flex flex-col min-h-full px-6 pb-56 overflow-y-auto">
      {/* Ambient glow blobs */}
      <div className="fixed top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* Step indicator */}
      <div className="pt-8 pb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center size-10 rounded-full hover:bg-primary/10 transition-colors"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined text-slate-100">arrow_back</span>
        </button>
        <div className="flex gap-1">
          <div className="h-1.5 w-12 rounded-full bg-primary" />
          <div className="h-1.5 w-12 rounded-full bg-primary" />
        </div>
        {/* Spacer to balance the back button */}
        <div className="size-10" />
      </div>

      {/* Context bar */}
      {selectedBean && effectiveMethodId && (
        <p className="text-xs text-slate-500 text-center mb-3">
          {selectedBean.beanName} <span className="text-primary">·</span> {prettyMethodName(effectiveMethodId)}
        </p>
      )}

      {/* Title */}
      <h1 className="text-3xl font-bold text-slate-100 mt-2 mb-1">
        How do you want to brew your {prettyMethodName(effectiveMethodId)}?
      </h1>
      <p className="text-sm text-slate-400 mb-4">Coach Kapi will adjust your recipe after you rate it.</p>

      {/* Missing step 1 guard */}
      {!selectedMethodId && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6">
          <p className="text-sm text-slate-400 mb-3">Step 1 selection is missing. Choose bean and method first.</p>
          <Link
            href="/log-brew"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Step 1
          </Link>
        </div>
      )}

      {/* Option cards */}
      <div className="flex flex-col gap-3 flex-1">
        {/* Follow the Coach — conditional */}
        {coachedBrew && (
          <button
            type="button"
            onClick={() => setChoice("coach")}
            className={`w-full rounded-xl border-2 text-left transition-all overflow-hidden ${
              choice === "coach"
                ? "border-primary bg-primary/10"
                : "border-primary/30 bg-primary/5 hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-0">
              <Image
                src="/coach/img2_reading_book.png"
                alt="Coach"
                width={80}
                height={80}
                className="w-20 h-20 object-contain shrink-0"
              />
              <div className="flex-1 min-w-0 py-3 pr-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">Recommended</p>
                <h3 className="text-base font-bold text-slate-100 leading-tight">Follow the Coach</h3>
                <p className="text-xs text-slate-400 mt-0.5">Apply your coach&apos;s advice from your last {prettyMethodName(effectiveMethodId)} brew.</p>
                {coachedBrew.coachingFeedback && (
                  <p className="text-xs text-primary/80 mt-1 italic line-clamp-1">&ldquo;{coachedBrew.coachingFeedback}&rdquo;</p>
                )}
                {coachedBrew.coachingChanges && coachedBrew.coachingChanges.length > 0 && (
                  <span className="inline-block mt-1 bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border border-primary/20">
                    {coachedBrew.coachingChanges.length} {coachedBrew.coachingChanges.length === 1 ? "change" : "changes"}
                  </span>
                )}
              </div>
            </div>
          </button>
        )}

        {/* Follow a Recipe */}
        <button
          type="button"
          onClick={() => setChoice("guided")}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
            choice === "guided"
              ? "border-primary bg-primary/10"
              : "border-transparent bg-primary/5 hover:border-primary/30"
          }`}
        >
          <div className="p-2 bg-primary/20 rounded-lg shrink-0">
            <span className="material-symbols-outlined text-primary text-xl">receipt_long</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <h3 className="text-base font-bold text-slate-100">Guide Me</h3>
              {recipeMethodKey && (
                <span className="shrink-0 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border border-primary/20">
                  {recipeCount} recipes
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Step-by-step guide through every pour and wait.</p>
          </div>
        </button>

        {/* Use My Own Recipe */}
        <button
          type="button"
          onClick={() => setChoice("freestyle")}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
            choice === "freestyle"
              ? "border-primary bg-primary/10"
              : "border-transparent bg-primary/5 hover:border-primary/30"
          }`}
        >
          <div className="p-2 bg-primary/20 rounded-lg shrink-0">
            <span className="material-symbols-outlined text-primary text-xl">edit_note</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-100 mb-0.5">I'll Freestyle</h3>
            <p className="text-xs text-slate-400">Feeling confident? Just log what you brew as you go.</p>
          </div>
        </button>
      </div>

      {/* Kapi illustration */}
      <div className="flex justify-center mt-6">
        <img
          src="/coach/coffee_coach_thinking.png"
          alt="Coach Kapi thinking"
          width={120}
          height={120}
          style={{ mixBlendMode: "screen" }}
        />
      </div>

      {/* Floating Next button */}
      <div className="fixed bottom-36 left-0 right-0 z-30 px-4 max-w-phone mx-auto">
        <button
          type="button"
          onClick={handleNext}
          disabled={!choice || !selectedMethodId}
          className="w-full bg-primary text-background-dark font-bold py-4 rounded-xl shadow-xl shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          Next
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </main>
  );
}
