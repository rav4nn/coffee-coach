"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

import { GoalPicker } from "@/components/GoalPicker";
import { SymptomPicker } from "@/components/SymptomPicker";
import { BrewShareCard } from "@/components/share/BrewShareCard";
import { postCoachingApi, postFavouriteBrewApi, type CoachingResponseApi, type CoachingChangeApi } from "@/lib/api";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";
import { useBeansStore } from "@/lib/beansStore";
import { useLogBrewStore } from "@/lib/logBrewStore";
import { captureAsBlob, shareOrDownload, SHARE_CAPTION } from "@/lib/shareUtils";

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
    <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Suggested adjustments</p>
      {displayable.map((change, i) => (
        <div key={i} className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">{PARAM_LABELS[change.param] ?? change.param}</span>
          <span className="text-xs font-semibold text-primary">{formatChangeDisplay(change)}</span>
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
  const [isThinking, setIsThinking] = useState(false);
  const [dotCount, setDotCount] = useState(1);
  const [isSavingFavourite, setIsSavingFavourite] = useState(false);
  const [isFavouriteSaved, setIsFavouriteSaved] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userInitial, setUserInitial] = useState("U");

  useEffect(() => {
    if (!isThinking) return;
    const t = setInterval(() => setDotCount((d) => (d >= 3 ? 1 : d + 1)), 400);
    return () => clearInterval(t);
  }, [isThinking]);

  useEffect(() => {
    Promise.all([fetchEntries(), fetchBeans()]).finally(() => setDataLoaded(true));
  }, [fetchEntries, fetchBeans]);

  useEffect(() => {
    fetch("/api/users/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((user) => {
        if (typeof user.picture === "string" && user.picture) setUserAvatar(user.picture);
        if (typeof user.name === "string" && user.name) setUserInitial(user.name.charAt(0).toUpperCase());
      })
      .catch(() => {});
  }, []);

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
  const isRated = brew?.rating != null;
  const isPerfect = rating === 10;
  const isAlreadyFavourite = !!brew?.isFavourite;
  const isOscillating = response?.trend === "oscillating";

  const coachAvatar = isThinking
    ? "/coach/coffee_coach_thinking.png"
    : isLoading
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
  }

  function toggleGoal(goal: string) {
    setSelectedGoals((current) => {
      const exists = current.includes(goal);
      return exists ? [] : [goal]; // single selection
    });
  }

  async function handleGetCoaching() {
    const payload: { symptoms?: string[]; goals?: string[] } = {};
    if (selectedSymptoms.length > 0) payload.symptoms = selectedSymptoms;
    if (selectedGoals.length > 0) payload.goals = selectedGoals;
    if (!Object.keys(payload).length) return;

    setIsThinking(true);
    const startTime = Date.now();
    try {
      await requestCoaching(payload);
      const remaining = Math.max(0, 2000 - (Date.now() - startTime));
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
    } catch {
      // cancelled — animation stops
    } finally {
      setIsThinking(false);
      setDotCount(1);
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

  const beanName = bean
    ? `${bean.roaster} — ${bean.beanName}`
    : brew.roasterName && brew.beanName
    ? `${brew.roasterName} — ${brew.beanName}`
    : brew.beanName ?? "Archived Bean";
  const imgSrc = methodImage(brew.methodId);
  const showCoachBubble = isLocked || (!isLocked && (!!response?.fix || isLoading));
  const showUserReply = !isPerfect && (!!response?.fix || isLocked);

  return (
    <main className="overflow-y-auto pb-28">
      <style>{`
        @keyframes kapiPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.08); }
        }
        .kapi-pulse { animation: kapiPulse 1s ease-in-out infinite; }

        @keyframes chatFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chat-bubble-wrapper {
          animation: chatFadeIn 0.5s ease-out 0.2s both;
        }
        .chat-bubble-tail::before {
          content: '';
          position: absolute;
          left: -9px;
          top: 14px;
          width: 0;
          height: 0;
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
          border-right: 8px solid rgba(244,157,37,0.3);
        }
        .chat-bubble-tail::after {
          content: '';
          position: absolute;
          left: -7px;
          top: 14px;
          width: 0;
          height: 0;
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
          border-right: 8px solid #2a1a0a;
        }

        @keyframes userBubbleFadeIn {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .user-reply-wrapper {
          animation: userBubbleFadeIn 0.4s ease-out 0.6s both;
        }
        .user-bubble-btn {
          transition: transform 100ms ease;
        }
        .user-bubble-btn:active {
          transform: scale(0.97);
        }
        .user-bubble-tail::before {
          content: '';
          position: absolute;
          right: -9px;
          top: 14px;
          width: 0;
          height: 0;
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
          border-left: 8px solid rgba(244,157,37,0.7);
        }
        .user-bubble-tail::after {
          content: '';
          position: absolute;
          right: -7px;
          top: 14px;
          width: 0;
          height: 0;
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
          border-left: 8px solid #1a1a2e;
        }
      `}</style>

      {/* Page title — back arrow lives in AppHeader */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Coaching</p>
            <h1 className="text-2xl font-bold text-slate-100">{isRated ? "Coach's Advice" : "How was this brew?"}</h1>
          </div>
          {(!isLocked && !response?.fix) && (
            <Image
              src={coachAvatar}
              alt="Coach"
              width={52}
              height={52}
              className={`object-contain drop-shadow-md transition-all duration-300 shrink-0${isThinking ? " animate-pulse" : ""}`}
            />
          )}
        </div>
      </div>

      <div className="px-4 pb-6 space-y-4">

        {/* Brew Parameters Card */}
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">

          {/* Method + bean header row with inline rating badge */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-espresso/20 border border-espresso/30 flex items-center justify-center shrink-0 overflow-hidden">
              <Image src={imgSrc} alt="" width={28} height={28} className="w-7 h-7 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-100 truncate">{beanName}</p>
              <p className="text-xs text-slate-400">{methodLabel(brew.methodId)}</p>
            </div>
            {brew.rating != null && (
              <div className="shrink-0 text-right leading-none">
                <span style={{ color: '#f49d25', fontSize: 20, fontWeight: 700 }}>{brew.rating}</span>
                <span style={{ color: 'rgba(244,157,37,0.5)', fontSize: 14, fontWeight: 600 }}>/10</span>
              </div>
            )}
          </div>

          {/* Parameter grid: 3 across, then 2 centered */}
          <div className="grid grid-cols-6 gap-2 text-center">
            <div className="col-span-2 bg-background-dark/40 rounded-lg py-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Dose</p>
              <p className="text-xs font-bold text-slate-200 mt-0.5">{brew.coffeeGrams}g</p>
            </div>
            <div className="col-span-2 bg-background-dark/40 rounded-lg py-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Water</p>
              <p className="text-xs font-bold text-slate-200 mt-0.5">{brew.waterMl}ml</p>
            </div>
            <div className="col-span-2 bg-background-dark/40 rounded-lg py-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Temp</p>
              <p className="text-xs font-bold text-slate-200 mt-0.5">{brew.waterTempC ? `${brew.waterTempC}°C` : "—"}</p>
            </div>
            <div className="col-span-3 bg-background-dark/40 rounded-lg py-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Grind</p>
              <p className="text-xs font-bold text-slate-200 mt-0.5">
                {brew.grinderClicks ? `${brew.grinderClicks} clicks` : brew.grindSize}
              </p>
            </div>
            <div className="col-span-3 bg-background-dark/40 rounded-lg py-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Brew Time</p>
              <p className="text-xs font-bold text-slate-200 mt-0.5">{brew.brewTime || "—"}</p>
            </div>
          </div>

          {/* Share pill button */}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setIsSharing(true)}
              disabled={isSharing}
              className="flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 transition-colors"
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                border: '1px solid rgba(244,157,37,0.6)',
                color: '#f49d25',
              }}
            >
              <span className="material-symbols-outlined text-base">share</span>
              Share brew
            </button>
          </div>
        </div>

        {/* Symptoms — shown before coaching is requested */}
        {!isLocked && !isPerfect && !response?.fix && (
          <div className="space-y-2">
            {isOscillating ? (
              <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4 text-sm text-slate-300">
                Keep brew inputs consistent for 2–3 brews before making new changes.
              </div>
            ) : (
              <>
                <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold">What do you want to fix?</p>
                <SymptomPicker selected={selectedSymptoms} onToggle={toggleSymptom} />
              </>
            )}
          </div>
        )}

        {/* Goals — below symptoms */}
        {!isLocked && !isPerfect && !response?.fix && !isOscillating && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold">Set a goal</p>
            <GoalPicker selected={selectedGoals} maxSelections={1} onToggle={toggleGoal} />
          </div>
        )}

        {/* 10/10 perfect brew — already saved as favourite */}
        {isPerfect && isAlreadyFavourite && (
          <div className="rounded-2xl bg-primary/10 border border-primary/30 p-5 text-center space-y-3">
            <span className="material-symbols-outlined text-primary text-4xl">star</span>
            <p className="font-bold text-slate-100 text-lg">Excellent brew!</p>
          </div>
        )}

        {/* 10/10 perfect brew — not yet saved */}
        {isPerfect && !isAlreadyFavourite && !isLocked && (
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

        {/* Kapi chat bubble */}
        {showCoachBubble && (
          <div className="chat-bubble-wrapper flex items-start gap-3">
            <img
              src="/coach/coffee_coach_whispering.png"
              alt="Coach Kapi"
              width={56}
              height={56}
              className="shrink-0"
              style={{ mixBlendMode: "screen" }}
            />
            <div
              className="chat-bubble-tail relative flex-1 p-4"
              style={{
                background: "#2a1a0a",
                border: "1px solid rgba(244,157,37,0.3)",
                borderRadius: "4px 16px 16px 16px",
              }}
            >
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: "#f49d25" }}>
                Coach Kapi
              </p>
              {isLoading ? (
                <p className="text-sm text-slate-400 animate-pulse">Getting your coaching tip…</p>
              ) : (
                <>
                  <p className="text-base font-medium text-slate-100 leading-relaxed">{response?.fix}</p>
                  {response?.freshness_caveat && (
                    <p className="mt-2 text-xs text-slate-400">Freshness note: {response.freshness_caveat}</p>
                  )}
                  {response?.changes && <CoachingChanges changes={response.changes} />}
                </>
              )}
            </div>
          </div>
        )}

        {/* User reply chat bubble — replaces "Brew with the coach's help" button */}
        {showUserReply && (
          <div className="user-reply-wrapper flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleBrewWithCoach}
              className="user-bubble-btn user-bubble-tail relative"
              style={{
                background: "#1a1a2e",
                border: "1.5px solid rgba(244,157,37,0.7)",
                borderRadius: "16px 16px 4px 16px",
                boxShadow: "0 0 8px rgba(244,157,37,0.19)",
                padding: "12px 16px",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-300" style={{ fontSize: 16 }}>coffee_maker</span>
                <span className="text-slate-100" style={{ fontSize: 15, fontWeight: 500 }}>
                  Brew with coach&apos;s help <span style={{ color: "#f49d25" }}>→</span>
                </span>
              </div>
            </button>
            {userAvatar ? (
              <img
                src={userAvatar}
                alt="You"
                width={40}
                height={40}
                className="rounded-full shrink-0 object-cover"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-base font-bold"
                style={{ background: "#2a1a0a", border: "1px solid rgba(244,157,37,0.3)", color: "#f49d25" }}
              >
                {userInitial}
              </div>
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
            disabled={isLoading || isThinking}
            className="w-full h-12 rounded-xl font-bold text-base transition-colors"
            style={{ backgroundColor: isThinking ? '#c47d10' : '#f49d25', color: '#1a0f00' }}
          >
            {isThinking
              ? `Coach Kapi is thinking${'.'.repeat(dotCount)}`
              : 'Get Coaching'
            }
          </button>
        )}

        {/* Brew this again — for already-favourite 10/10 brews */}
        {isPerfect && isAlreadyFavourite && (
          <button
            type="button"
            onClick={handleBrewWithCoach}
            className="w-full h-12 rounded-xl bg-primary text-background-dark font-bold text-base flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">coffee_maker</span>
            Brew this again
          </button>
        )}

        {/* Done after saving favourite — only for newly rated 10/10 not yet saved */}
        {isPerfect && !isAlreadyFavourite && !isLocked && (
          <button
            onClick={() => router.push("/coach")}
            className={`w-full h-12 rounded-xl font-bold text-base ${isFavouriteSaved ? "bg-primary text-background-dark" : "border border-primary/30 text-primary"}`}
          >
            {isFavouriteSaved ? "Done" : "Skip for Now"}
          </button>
        )}
      </div>

      {/* Off-screen brew share card capture */}
      {isSharing && (
        <div
          style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none" }}
          ref={(el) => {
            if (!el) return;
            captureAsBlob(el)
              .then((blob) => shareOrDownload(blob, "coffee-coach-brew.png", SHARE_CAPTION))
              .finally(() => setIsSharing(false));
          }}
        >
          <BrewShareCard entry={brew} beanName={beanName} />
        </div>
      )}
    </main>
  );
}
