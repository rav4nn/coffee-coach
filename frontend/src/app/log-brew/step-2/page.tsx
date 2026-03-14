"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import recipes from "@/data/recipes.json";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";
import { useLogBrewStore } from "@/lib/logBrewStore";

type Choice = "coach" | "guided" | "freestyle";

type RecipeRecord = {
  method?: string;
};

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

  const entries = useBrewHistoryStore((state) => state.entries);

  const effectiveMethodId = useMemo(() => {
    if (selectedMethodId === "pour_over") {
      return selectedPourOverDeviceId ?? selectedMethodId;
    }
    return selectedMethodId;
  }, [selectedMethodId, selectedPourOverDeviceId]);

  // Find most recent brew for same bean+method combo that has coaching changes
  const coachedBrew = useMemo(() => {
    if (!selectedBeanId || !effectiveMethodId) return null;
    const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted.find(
      (e) =>
        e.beanId === selectedBeanId &&
        e.methodId === effectiveMethodId &&
        e.coachingChanges &&
        e.coachingChanges.length > 0,
    ) ?? null;
  }, [entries, selectedBeanId, effectiveMethodId]);

  const recipeMethodKey = useMemo(
    () => toRecipeMethodKey(selectedMethodId, selectedPourOverDeviceId),
    [selectedMethodId, selectedPourOverDeviceId],
  );

  const recipeCount = useMemo(() => {
    if (!recipeMethodKey) {
      return 0;
    }

    return (recipes as RecipeRecord[]).filter((recipe) => recipe.method === recipeMethodKey).length;
  }, [recipeMethodKey]);

  function handleNext() {
    if (!choice) {
      return;
    }

    if (choice === "coach" && coachedBrew?.coachingChanges) {
      setCoachMode(coachedBrew, coachedBrew.coachingChanges);
      router.push("/log-brew/freestyle");
      return;
    }

    router.push(choice === "guided" ? "/log-brew/guided" : "/log-brew/freestyle");
  }

  return (
    <main className="relative flex flex-col min-h-full px-6 pb-28 overflow-y-auto">
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

      {/* Title */}
      <h1 className="text-3xl font-bold text-slate-100 mt-4 mb-2">Choose Your Logging Style</h1>
      <p className="text-sm text-slate-400 mb-8">Pick how you want to continue this brew session.</p>

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
      <div className="flex flex-col gap-4 flex-1">
        {/* Follow the Coach — conditional */}
        {coachedBrew && (
          <button
            type="button"
            onClick={() => setChoice("coach")}
            className={`w-full flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all ${
              choice === "coach"
                ? "border-primary bg-primary/10"
                : "border-transparent bg-primary/5 hover:border-primary/30"
            }`}
          >
            <Image
              src="/coach/img3_whistle_blowing.png"
              alt="Coach"
              width={56}
              height={56}
              className="w-14 h-14 object-contain shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between w-full mb-1">
                <h3 className="text-xl font-bold text-slate-100">Follow the Coach</h3>
                <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest border border-primary/20 shrink-0 ml-2">
                  {coachedBrew.coachingChanges?.length} {coachedBrew.coachingChanges?.length === 1 ? "change" : "changes"}
                </span>
              </div>
              <p className="text-sm text-slate-400">Apply your coach&apos;s advice from your last {prettyMethodName(effectiveMethodId)} brew.</p>
              {coachedBrew.coachingFeedback && (
                <p className="text-xs text-primary/70 mt-2 italic truncate">&ldquo;{coachedBrew.coachingFeedback}&rdquo;</p>
              )}
            </div>
          </button>
        )}

        {/* Follow a Recipe */}
        <button
          type="button"
          onClick={() => setChoice("guided")}
          className={`w-full flex flex-col p-5 rounded-xl border-2 text-left transition-all ${
            choice === "guided"
              ? "border-primary bg-primary/10"
              : "border-transparent bg-primary/5 hover:border-primary/30"
          }`}
        >
          <div className="flex items-start justify-between w-full mb-3">
            <div className="p-3 bg-primary/20 rounded-lg">
              <span className="material-symbols-outlined text-primary text-3xl">receipt_long</span>
            </div>
            {recipeMethodKey && (
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest border border-primary/20">
                {recipeCount} Recipes for {prettyMethodName(recipeMethodKey)}
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-1">Follow a Recipe</h3>
          <p className="text-sm text-slate-400">We&apos;ll guide you step by step through every pour and wait time.</p>
        </button>

        {/* Use My Own Recipe */}
        <button
          type="button"
          onClick={() => setChoice("freestyle")}
          className={`w-full flex flex-col p-5 rounded-xl border-2 text-left transition-all ${
            choice === "freestyle"
              ? "border-primary bg-primary/10"
              : "border-transparent bg-primary/5 hover:border-primary/30"
          }`}
        >
          <div className="flex items-start justify-between w-full mb-3">
            <div className="p-3 bg-primary/20 rounded-lg">
              <span className="material-symbols-outlined text-primary text-3xl">edit_note</span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-1">Use My Own Recipe</h3>
          <p className="text-sm text-slate-400">Feeling confident? Just log what you brew as you go.</p>
        </button>
      </div>

      {/* Next button */}
      <button
        type="button"
        onClick={handleNext}
        disabled={!choice || !selectedMethodId}
        className="w-full mt-8 bg-primary text-background-dark font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] transition-transform"
      >
        Next
        <span className="material-symbols-outlined">arrow_forward</span>
      </button>
    </main>
  );
}
