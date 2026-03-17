"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

import { GoalPicker } from "@/components/GoalPicker";
import { SymptomPicker } from "@/components/SymptomPicker";
import { postCoachingApi, postFavouriteBrewApi, type CoachingResponseApi, type CoachingChangeApi } from "@/lib/api";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";
import { useBeansStore } from "@/lib/beansStore";
import { useLogBrewStore } from "@/lib/logBrewStore";

function methodLabel(methodId: string | null | undefined) {
  if (!methodId) return "Unknown Method";
  return methodId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function methodImage(methodId: string | null | undefined): string {
  if (!methodId) return "/methods/pour_over.png";
  if (methodId.includes("pour_over") || methodId === "v60" || methodId === "chemex" || methodId === "kalita_wave" || methodId === "clever_dripper" || methodId === "hario_switch" || methodId === "wilfa_pour_over" || methodId === "origami_dripper") return "/methods/pour_over.png";
  if (methodId.includes("aeropress")) return "/methods/aeropress.png";
  if (methodId.includes("french_press")) return "/methods/french_press.png";
  if (methodId.includes("moka_pot")) return "/methods/moka_pot.png";
  if (methodId.includes("cold_brew")) return "/methods/cold_brew.png";
  if (methodId.includes("south_indian_filter")) return "/methods/filter.png";
  return "/methods/pour_over.png";
}

const PARAM_LABELS: Record<string, string> = {
  grindSize: "Grind",
  coffeeGrams: "Dose",
  waterTempC: "Temp",
  brewTime: "Brew Time",
};

function formatChangeDisplay(change: CoachingChangeApi): string {
  const prev = change.previousValue;
  const next = change.newValue;
  if (prev == null || next == null) return change.suggestion;
  if (change.param === "grindSize" && typeof prev === "number" && typeof next === "number") {
    return `${prev} clicks → ${next} clicks`;
  }
  if (change.param === "coffeeGrams") return `${prev}g → ${next}g`;
  if (change.param === "waterTempC") return `${prev}°C → ${next}°C`;
  return `${prev} → ${next}`;
}

function CoachingChanges({ changes }: { changes: CoachingChangeApi[] }) {
  const displayable = changes.filter((c) => c.previousValue != null && c.newValue != null);
  if (displayable.length === 0) return null;
  return (
    <div className="mt-3 pt-3 border-t border-primary/15 space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest text-primary/50 font-semibold">Suggested adjustments</p>
      {displayable.map((change, i) => (
        <div key={i} className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">{PARAM_LABELS[change.param] ?? change.param}</span>
          <span className="text-xs font-semibold text-slate-200">{formatChangeDisplay(change)}</span>
        </div>
      ))}
    </div>
  );
}

export default function BrewCoachPage() {
  const params = useParams();
  const router = useRouter();
  const brewId = params.id as string;

  const entries = useBrewHistoryStore((state) => state.entries);
  const fetchEntries = useBrewHistoryStore((state) => state.fetchEntries);
  const updateEntry = useBrewHistoryStore((state) => state.updateEntry);
  const beans = useBeansStore((state) => state.userBeans);
  const fetchBeans = useBeansStore((state) => state.fetchBeans);
  const setCoachMode = useLogBrewStore((state) => state.setCoachMode);
  const setStepOneSelection = useLogBrewStore((state) => state.setStepOneSelection);

  const [rating, setRating] = useState<number>(6);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [response, setResponse] = useState<CoachingResponseApi | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingFavourite, setIsSavingFavourite] = useState(false);
  const [isFavouriteSaved, setIsFavouriteSaved] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    Promise.all([fetchEntries(), fetchBeans()]).finally(() => setDataLoaded(true));
  }, [fetchEntries, fetchBeans]);

  const brew = useMemo(() => entries.find((e) => e.id === brewId) ?? null, [entries, brewId]);
  const bean = useMemo(() => (brew?.beanId ? beans.find((b) => b.id === brew.beanId) : null), [brew, beans]);

  // Hydrate from existing brew data
  useEffect(() => {
    if (brew) {
      setRating(brew.rating ?? 6);
      if (brew.coachingFeedback) {
        setResponse({
          fix: brew.coachingFeedback,
          changes: brew.coachingChanges ?? undefined,
        });
      }
    }
  }, [brew]);

  const isLocked = !!brew?.coachingFeedback;
  const isPerfect = rating === 10;
  const isOscillating = response?.trend === "oscillating";

  const coachAvatar = isLoading
    ? "/coach/img2_laptop_focused.png"
    : isPerfect
    ? "/coach/img3_hero_thumbs_up.png"
    : response?.fix
    ? "/coach/img3_whistle_blowing.png"
    : isLocked
    ? "/coach/img3_thumbs_whistle.png"
    : "/coach/img3_holding_whistle.png";

  function handleRatingChange(value: number) {
    setRating(value);
    if (brewId) {
      void updateEntry(brewId, { rating: value });
    }
  }

  // Gather recent brews for same bean+method (for trend detection)
  const recentBrewsForTrend = useMemo(() => {
    if (!brew) return [];
    return entries
      .filter((e) => e.beanId === brew.beanId && e.methodId === brew.methodId && e.id !== brew.id)
      .slice(0, 4)
      .map((e) => ({
        rating: e.rating ?? null,
        coaching_changes: e.coachingChanges ?? null,
        coach_followed: (e as Record<string, unknown>).coachFollowed as boolean | null ?? null,
      }));
  }, [entries, brew]);

  async function requestCoaching(payload: { symptoms?: string[]; goals?: string[] }) {
    if (!brewId || !brew) return;
    setIsLoading(true);
    try {
      const data = await postCoachingApi({
        brew_id: brewId,
        ...payload,
        rating,
        current_params: {
          coffeeGrams: brew.coffeeGrams,
          waterMl: brew.waterMl,
          waterTempC: brew.waterTempC,
          grindSize: brew.grindSize,
          brewTime: brew.brewTime,
          ...(brew.grinderClicks ? { grinderClicks: brew.grinderClicks, grinderName: brew.grinderName ?? undefined } : {}),
        },
        recent_brews: recentBrewsForTrend,
      });
      setResponse(data);
      void updateEntry(brewId, {
        rating,
        coachingFeedback: data.fix,
        coachingChanges: data.changes ?? null,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSymptom(symptom: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
    setSelectedGoals([]);
  }

  function toggleGoal(goal: string) {
    setSelectedGoals((current) => {
      const exists = current.includes(goal);
      return exists ? [] : [goal]; // single selection
    });
    setSelectedSymptoms([]);
  }

  function handleGetCoaching() {
    if (selectedSymptoms.length > 0) {
      void requestCoaching({ symptoms: selectedSymptoms });
    } else if (selectedGoals.length > 0) {
      void requestCoaching({ goals: selectedGoals });
    }
  }

  async function handleSaveFavourite() {
    if (!brewId) return;
    setIsSavingFavourite(true);
    try {
      await Promise.all([
        postFavouriteBrewApi({ brew_id: brewId }),
        updateEntry(brewId, { rating: 10, isFavourite: true }),
      ]);
      setIsFavouriteSaved(true);
    } finally {
      setIsSavingFavourite(false);
    }
  }

  function handleBrewWithCoach() {
    if (!brew) return;
    setCoachMode(brew, brew.coachingChanges ?? [], brew.recipeId);
    if (brew.beanId && brew.methodId) {
      setStepOneSelection({ beanId: brew.beanId, methodId: brew.methodId, pourOverDeviceId: null });
    }
    if (brew.recipeId && brew.brewType === "guided") {
      router.push(`/log-brew/guided/${brew.recipeId}`);
    } else {
      router.push("/log-brew/freestyle");
    }
  }

  const canGetCoaching =
    !isLocked &&
    !isPerfect &&
    !response?.fix &&
    (selectedSymptoms.length > 0 || selectedGoals.length > 0);

  // Loading state
  if (!dataLoaded) {
    return (
      <main className="pb-28">
        <div className="px-4 pt-6 space-y-4">
          <div className="h-8 w-32 rounded-lg bg-primary/10 animate-pulse" />
          <div className="h-32 rounded-2xl bg-primary/5 border border-primary/10 animate-pulse" />
          <div className="h-24 rounded-2xl bg-primary/5 border border-primary/10 animate-pulse" />
        </div>
      </main>
    );
  }

  // Brew not found
  if (!brew) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <span className="material-symbols-outlined text-5xl text-primary/40">error</span>
        <h1 className="text-xl font-bold text-slate-100 text-center">Brew not found</h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-bold text-primary"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Go back
        </button>
      </main>
    );
  }

  const beanName = bean ? `${bean.roaster} — ${bean.beanName}` : "Unknown Bean";
  const imgSrc = methodImage(brew.methodId);

  return (
    <main className="overflow-y-auto pb-28">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center size-10 -ml-2 mb-1 rounded-full hover:bg-primary/10 transition-colors"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined text-slate-100">arrow_back</span>
        </button>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Coaching</p>
            <h1 className="text-2xl font-bold text-slate-100">How was this brew?</h1>
          </div>
          <Image
            src={coachAvatar}
            alt="Coach"
            width={52}
            height={52}
            className="object-contain drop-shadow-md transition-all duration-300 shrink-0"
          />
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Brew Parameters Summary */}
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-espresso/20 border border-espresso/30 flex items-center justify-center shrink-0 overflow-hidden">
              <Image src={imgSrc} alt="" width={28} height={28} className="w-7 h-7 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-100 truncate">{beanName}</p>
              <p className="text-xs text-slate-400">{methodLabel(brew.methodId)}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-background-dark/40 rounded-lg py-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Dose</p>
              <p className="text-xs font-bold text-slate-200 mt-0.5">{brew.coffeeGrams}g</p>
            </div>
            <div className="bg-background-dark/40 rounded-lg py-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Water</p>
              <p className="text-xs font-bold text-slate-200 mt-0.5">{brew.waterMl}ml</p>
            </div>
            <div className="bg-background-dark/40 rounded-lg py-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Temp</p>
              <p className="text-xs font-bold text-slate-200 mt-0.5">{brew.waterTempC ? `${brew.waterTempC}°C` : "—"}</p>
            </div>
            <div className="bg-background-dark/40 rounded-lg py-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Grind</p>
              <p className="text-xs font-bold text-slate-200 mt-0.5">
                {brew.grinderClicks ? `${brew.grinderClicks} clicks` : brew.grindSize}
              </p>
            </div>
          </div>
          {brew.brewTime && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <span className="material-symbols-outlined text-sm">timer</span>
              {brew.brewTime} brew time
            </div>
          )}
        </div>

        {/* Rating Slider */}
        <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-100">Rate This Brew</p>
            <span className="text-primary font-bold text-lg">
              {rating}<span className="text-xs text-slate-400">/10</span>
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={rating}
            onChange={(e) => !isLocked && handleRatingChange(Number(e.target.value))}
            disabled={isLocked}
            className="w-full accent-primary disabled:opacity-60"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-500">Poor</span>
            <span className="text-xs text-slate-500">Excellent</span>
          </div>
        </div>

        {/* 10/10 perfect brew */}
        {!isLocked && isPerfect && (
          <div className="rounded-2xl bg-primary/10 border border-primary/30 p-5 text-center space-y-3">
            <span className="material-symbols-outlined text-primary text-4xl">star</span>
            <p className="font-bold text-slate-100 text-lg">Excellent brew!</p>
            <p className="text-sm text-slate-400">You&apos;ve nailed this one. Save it so you can repeat it.</p>
            {isFavouriteSaved ? (
              <div className="flex items-center justify-center gap-2 text-primary font-semibold">
                <span className="material-symbols-outlined text-sm">favorite</span>
                Saved as Favourite
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSaveFavourite}
                disabled={isSavingFavourite}
                className="w-full h-12 rounded-xl bg-primary text-background-dark font-bold text-sm disabled:opacity-50"
              >
                {isSavingFavourite ? "Saving\u2026" : "Save this Recipe"}
              </button>
            )}
          </div>
        )}

        {/* Locked: read-only feedback */}
        {isLocked && response?.fix && (
          <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4">
            <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold mb-2">Coach Says</p>
            <p className="text-sm text-slate-100 leading-relaxed">{response.fix}</p>
            {response.freshness_caveat && (
              <p className="mt-2 text-xs text-slate-400">Freshness note: {response.freshness_caveat}</p>
            )}
            {response.changes && <CoachingChanges changes={response.changes} />}
          </div>
        )}

        {/* Symptom + Goal pickers (1-9 rating, not yet coached) */}
        {!isLocked && !isPerfect && !response?.fix && (
          <>
            {isOscillating ? (
              <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4 text-sm text-slate-300">
                Keep brew inputs consistent for 2\u20133 brews before making new changes.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold">What went wrong?</p>
                  <SymptomPicker
                    selected={selectedSymptoms}
                    onToggle={toggleSymptom}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold">Or set a goal</p>
                  <GoalPicker
                    selected={selectedGoals}
                    maxSelections={1}
                    onToggle={toggleGoal}
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* Coaching response */}
        {!isLocked && (response?.fix || isLoading) && (
          <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4">
            <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold mb-2">Coach Says</p>
            {isLoading ? (
              <p className="text-sm text-slate-400 animate-pulse">Getting your coaching tip\u2026</p>
            ) : (
              <>
                <p className="text-sm text-slate-100 leading-relaxed">{response?.fix}</p>
                {response?.freshness_caveat && (
                  <p className="mt-2 text-xs text-slate-400">Freshness note: {response.freshness_caveat}</p>
                )}
                {response?.changes && <CoachingChanges changes={response.changes} />}
              </>
            )}
          </div>
        )}

        {/* Escalation warning */}
        {response?.escalation && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-amber-400 text-base shrink-0 mt-0.5">lightbulb</span>
              <div>
                <p className="text-xs uppercase tracking-widest text-amber-400/80 font-semibold mb-1">Coach Suggestion</p>
                <p className="text-sm text-amber-100 leading-relaxed">{response.escalation.message}</p>
              </div>
            </div>
            {response.escalation.type === "recipe" && response.escalation.suggested_recipe_id && (
              <button
                type="button"
                onClick={() => router.push(`/log-brew/guided/${response.escalation!.suggested_recipe_id}`)}
                className="w-full h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber-500/30 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">receipt_long</span>
                Try Suggested Recipe
              </button>
            )}
            {response.escalation.type === "beans" && (
              <button
                type="button"
                onClick={() => router.push("/my-beans")}
                className="w-full h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber-500/30 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">eco</span>
                Browse Your Beans
              </button>
            )}
          </div>
        )}

        {/* Get Coaching button */}
        {canGetCoaching && (
          <button
            onClick={handleGetCoaching}
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-primary text-background-dark font-bold text-base disabled:opacity-50"
          >
            Get Coaching
          </button>
        )}

        {/* Brew with coach's help button */}
        {(response?.fix || isLocked) && (
          <button
            type="button"
            onClick={handleBrewWithCoach}
            className="w-full h-12 rounded-xl bg-primary text-background-dark font-bold text-base flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">coffee_maker</span>
            Brew with the coach&apos;s help
          </button>
        )}

        {/* Done after saving favourite */}
        {isPerfect && !isLocked && (
          <button
            onClick={() => router.push("/coach")}
            className={`w-full h-12 rounded-xl font-bold text-base ${isFavouriteSaved ? "bg-primary text-background-dark" : "border border-primary/30 text-primary"}`}
          >
            {isFavouriteSaved ? "Done" : "Skip for Now"}
          </button>
        )}
      </div>
    </main>
  );
}
