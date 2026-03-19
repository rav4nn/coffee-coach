"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type AnimPhase = "idle" | "exiting" | "thinking" | "typing" | "done";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userInitial, setUserInitial] = useState("U");

  // ── Animation state ──────────────────────────────────────────────────────
  const [animPhase, setAnimPhase] = useState<AnimPhase>("idle");
  const [selectionRemoved, setSelectionRemoved] = useState(false);

  // Main coaching bubble
  const [coachBubbleVisible, setCoachBubbleVisible] = useState(false);
  const [coachIsThinking, setCoachIsThinking] = useState(false);
  const [typewriterText, setTypewriterText] = useState("");
  const [showCursor, setShowCursor] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);

  // User bubble
  const [userBubbleSlideIn, setUserBubbleSlideIn] = useState(false);
  const [userBubbleText, setUserBubbleText] = useState("");
  const [showUserCursor, setShowUserCursor] = useState(false);

  // Kapi reply bubble
  const [kapiReplyVisible, setKapiReplyVisible] = useState(false);
  const [kapiReplyThinking, setKapiReplyThinking] = useState(false);
  const [kapiReplyText, setKapiReplyText] = useState("");
  const [showKapiReplyCursor, setShowKapiReplyCursor] = useState(false);

  // CTA button
  const [showCtaBtn, setShowCtaBtn] = useState(false);
  const [ctaBtnAnimate, setCtaBtnAnimate] = useState(false);

  // Title
  const [titleFading, setTitleFading] = useState(false);
  const [titleIsAdvice, setTitleIsAdvice] = useState(false);

  // Refs
  const coachingRef = useRef<HTMLDivElement>(null);
  const userBubbleRef = useRef<HTMLDivElement>(null);
  const kapiReplyRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const userRafRef = useRef<number | null>(null);
  const kapiRafRef = useRef<number | null>(null);

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

  // For already-coached brews: skip all animations, show everything immediately
  useEffect(() => {
    if (isLocked && brew?.coachingFeedback) {
      setCoachBubbleVisible(true);
      setTypewriterText(brew.coachingFeedback);
      setTitleIsAdvice(true);
      setShowAdjustments(true);
      setUserBubbleSlideIn(true);
      setUserBubbleText("Help me brew this better.");
      setKapiReplyVisible(true);
      setKapiReplyText("Sure, here you go!");
      setShowCtaBtn(true);
    }
  }, [isLocked, brew?.coachingFeedback]);

  // Cleanup all RAFs on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (userRafRef.current) cancelAnimationFrame(userRafRef.current);
      if (kapiRafRef.current) cancelAnimationFrame(kapiRafRef.current);
    };
  }, []);

  function handleRatingChange(value: number) {
    setRating(value);
    if (brewId) void updateEntry(brewId, { rating: value });
  }

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

  async function requestCoaching(payload: { symptoms?: string[]; goals?: string[] }): Promise<CoachingResponseApi | null> {
    if (!brewId || !brew) return null;
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
      return data;
    } catch {
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  // Main coaching typewriter — 18ms/char, cursor blinks twice then hides
  const runTypewriter = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      setShowCursor(true);
      setTypewriterText("");
      let charIdx = 0;
      let lastTime: number | null = null;
      const MS_PER_CHAR = 18;

      function tick(timestamp: number) {
        if (lastTime === null) lastTime = timestamp;
        const elapsed = timestamp - lastTime;
        const charsToAdd = Math.floor(elapsed / MS_PER_CHAR);
        if (charsToAdd > 0) {
          lastTime = timestamp - (elapsed % MS_PER_CHAR);
          charIdx = Math.min(charIdx + charsToAdd, text.length);
          setTypewriterText(text.slice(0, charIdx));
        }
        if (charIdx < text.length) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setTimeout(() => setShowCursor(false), 1060); // blinks twice
          resolve();
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    });
  }, []);

  // User bubble typewriter — 18ms/char, cursor blinks once then hides
  const runUserTypewriter = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      setShowUserCursor(true);
      setUserBubbleText("");
      let charIdx = 0;
      let lastTime: number | null = null;
      const MS_PER_CHAR = 18;

      function tick(timestamp: number) {
        if (lastTime === null) lastTime = timestamp;
        const elapsed = timestamp - lastTime;
        const charsToAdd = Math.floor(elapsed / MS_PER_CHAR);
        if (charsToAdd > 0) {
          lastTime = timestamp - (elapsed % MS_PER_CHAR);
          charIdx = Math.min(charIdx + charsToAdd, text.length);
          setUserBubbleText(text.slice(0, charIdx));
        }
        if (charIdx < text.length) {
          userRafRef.current = requestAnimationFrame(tick);
        } else {
          setTimeout(() => setShowUserCursor(false), 530); // blinks once
          resolve();
        }
      }
      userRafRef.current = requestAnimationFrame(tick);
    });
  }, []);

  // Kapi reply typewriter — 22ms/char (slower for effect), cursor blinks once then hides
  const runKapiReplyTypewriter = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      setShowKapiReplyCursor(true);
      setKapiReplyText("");
      let charIdx = 0;
      let lastTime: number | null = null;
      const MS_PER_CHAR = 22;

      function tick(timestamp: number) {
        if (lastTime === null) lastTime = timestamp;
        const elapsed = timestamp - lastTime;
        const charsToAdd = Math.floor(elapsed / MS_PER_CHAR);
        if (charsToAdd > 0) {
          lastTime = timestamp - (elapsed % MS_PER_CHAR);
          charIdx = Math.min(charIdx + charsToAdd, text.length);
          setKapiReplyText(text.slice(0, charIdx));
        }
        if (charIdx < text.length) {
          kapiRafRef.current = requestAnimationFrame(tick);
        } else {
          setTimeout(() => setShowKapiReplyCursor(false), 530); // blinks once
          resolve();
        }
      }
      kapiRafRef.current = requestAnimationFrame(tick);
    });
  }, []);

  function toggleSymptom(symptom: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  }

  function toggleGoal(goal: string) {
    setSelectedGoals((current) => {
      const exists = current.includes(goal);
      return exists ? [] : [goal];
    });
  }

  async function handleGetCoaching() {
    const payload: { symptoms?: string[]; goals?: string[] } = {};
    if (selectedSymptoms.length > 0) payload.symptoms = selectedSymptoms;
    if (selectedGoals.length > 0) payload.goals = selectedGoals;
    if (!Object.keys(payload).length) return;

    // ── PHASE 1: Exit (0ms → 300ms) ─────────────────────────────────────
    setAnimPhase("exiting");
    const apiPromise = requestCoaching(payload);
    await delay(300);
    setSelectionRemoved(true);

    // ── PHASE 2: Kapi thinking appears (350ms) ───────────────────────────
    await delay(50); // 300 + 50 = 350ms from tap
    setCoachBubbleVisible(true);
    setCoachIsThinking(true);
    setAnimPhase("thinking");
    setTimeout(() => coachingRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);

    // Wait for API + 2200ms minimum thinking time
    const thinkStart = Date.now();
    const data = await apiPromise;
    const thinkElapsed = Date.now() - thinkStart;
    if (thinkElapsed < 2200) await delay(2200 - thinkElapsed);

    if (!data?.fix) {
      setAnimPhase("idle");
      setSelectionRemoved(false);
      setCoachBubbleVisible(false);
      setCoachIsThinking(false);
      return;
    }

    // ── PHASE 3: Title crossfade + coaching typewriter ───────────────────
    setTitleFading(true);
    await delay(200);
    setTitleIsAdvice(true);
    setTitleFading(false);
    setCoachIsThinking(false);
    setAnimPhase("typing");
    await runTypewriter(data.fix);

    // ── PHASE 4: Suggested adjustments fade in (after typewriter + 300ms) ──
    await delay(300);
    setShowAdjustments(true);
    const hasAdjustments = (data.changes ?? []).filter(
      (c) => c.previousValue != null && c.newValue != null
    ).length > 0;
    if (hasAdjustments) await delay(400);

    // ── PHASE 5: User bubble slides in + typewriter (after Phase 4 + 400ms) ─
    await delay(400);
    setUserBubbleSlideIn(true);
    setTimeout(() => userBubbleRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
    await delay(300); // wait for slide-in to complete
    await runUserTypewriter("Help me brew this better.");

    // ── PHASE 6: Kapi reply thinking (after user typewriter + 500ms) ─────
    await delay(500);
    setKapiReplyVisible(true);
    setKapiReplyThinking(true);
    setTimeout(() => kapiReplyRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
    await delay(800);

    // ── PHASE 7: Kapi reply typewriter ───────────────────────────────────
    setKapiReplyThinking(false);
    await runKapiReplyTypewriter("Sure, here you go!");

    // ── PHASE 8: CTA button spring entrance (after typewriter + 200ms) ───
    await delay(200);
    setShowCtaBtn(true);
    setCtaBtnAnimate(true);

    setAnimPhase("done");
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

  // ── Derived display values ────────────────────────────────────────────────
  // Button reveals on ANY pill selection
  const anySelected = selectedSymptoms.length > 0 || selectedGoals.length > 0;

  const showSelectionUI = !isLocked && !isPerfect && !selectionRemoved && (animPhase === "idle" || animPhase === "exiting");
  const showGetCoachingBtn = showSelectionUI;
  const showCoachBubble = coachBubbleVisible;

  // For locked brews on initial render (before useEffect fires), prevent flash
  const displayedText = (animPhase === "idle" && isLocked) ? (brew?.coachingFeedback ?? "") : typewriterText;
  const displayedUserText = isLocked ? "Help me brew this better." : userBubbleText;
  const displayedKapiReplyText = isLocked ? "Sure, here you go!" : kapiReplyText;

  const effectiveShowAdjustments = (isLocked && !isPerfect) || showAdjustments;
  const effectiveUserBubbleSlideIn = (isLocked && !isPerfect) || userBubbleSlideIn;
  const effectiveKapiReplyVisible = (isLocked && !isPerfect) || kapiReplyVisible;
  const effectiveShowCtaBtn = (isLocked && !isPerfect) || showCtaBtn;

  const displayedTitle = (isLocked || titleIsAdvice || isRated) ? "Coach's Advice" : "How was this brew?";

  const exitStyle = animPhase === "exiting"
    ? { opacity: 0, transform: "translateY(-16px)", transition: "opacity 300ms ease-out, transform 300ms ease-out", willChange: "opacity, transform" as const }
    : { opacity: 1, transform: "translateY(0)", transition: "none", willChange: "auto" as const };

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

  if (!brew) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <span className="material-symbols-outlined text-5xl text-primary/40">error</span>
        <h1 className="text-xl font-bold text-slate-100 text-center">Brew not found</h1>
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-bold text-primary">
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

  return (
    <main className="overflow-y-auto pb-48">
      <style>{`
        @keyframes chatFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chat-bubble-wrapper { animation: chatFadeIn 0.35s ease-out both; }

        .chat-bubble-tail::before {
          content: ''; position: absolute; left: -9px; top: 14px;
          width: 0; height: 0;
          border-top: 8px solid transparent; border-bottom: 8px solid transparent;
          border-right: 8px solid rgba(244,157,37,0.3);
        }
        .chat-bubble-tail::after {
          content: ''; position: absolute; left: -7px; top: 14px;
          width: 0; height: 0;
          border-top: 8px solid transparent; border-bottom: 8px solid transparent;
          border-right: 8px solid #2a1a0a;
        }

        .user-bubble-tail::before {
          content: ''; position: absolute; right: -9px; top: 12px;
          width: 0; height: 0;
          border-top: 7px solid transparent; border-bottom: 7px solid transparent;
          border-left: 8px solid rgba(244,157,37,0.5);
        }
        .user-bubble-tail::after {
          content: ''; position: absolute; right: -7px; top: 12px;
          width: 0; height: 0;
          border-top: 7px solid transparent; border-bottom: 7px solid transparent;
          border-left: 8px solid #1e1e2e;
        }

        .cta-press { transition: transform 100ms ease; }
        .cta-press:active { transform: scale(0.97); }

        @keyframes dotBounce {
          0%, 100% { transform: scale(0.6); opacity: 0.5; }
          50%       { transform: scale(1.2); opacity: 1; }
        }
        .thinking-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #f49d25; display: inline-block;
        }
        .thinking-dot-1 { animation: dotBounce 600ms ease-in-out 0ms infinite; }
        .thinking-dot-2 { animation: dotBounce 600ms ease-in-out 150ms infinite; }
        .thinking-dot-3 { animation: dotBounce 600ms ease-in-out 300ms infinite; }

        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        .typewriter-cursor {
          animation: cursorBlink 530ms ease-in-out infinite;
          color: #f49d25;
          margin-left: 1px;
          font-weight: 300;
        }

        @keyframes ctaPop {
          0%   { opacity: 0; transform: scale(0.75); }
          60%  { opacity: 1; transform: scale(1.08); }
          80%  { transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1.0); }
        }
        @keyframes ctaPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.04); }
        }
      `}</style>

      {/* Page title */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Coaching</p>
          <h1
            className="text-2xl font-bold text-slate-100"
            style={{ transition: "opacity 200ms ease", opacity: titleFading ? 0 : 1 }}
          >
            {displayedTitle}
          </h1>
        </div>
      </div>

      <div className="px-4 pb-6">

        {/* Brew Parameters Card */}
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-espresso/20 border border-espresso/30 flex items-center justify-center shrink-0 overflow-hidden">
              <Image src={imgSrc} alt="" width={28} height={28} className="w-7 h-7 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-100 leading-snug" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                {beanName.length > 40 ? beanName.slice(0, 40) + "…" : beanName}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{methodLabel(brew.methodId)}</p>
            </div>
            {brew.rating != null && (
              <div className="shrink-0 text-right leading-none">
                <span style={{ color: '#f49d25', fontSize: 20, fontWeight: 700 }}>{brew.rating}</span>
                <span style={{ color: 'rgba(244,157,37,0.5)', fontSize: 14, fontWeight: 600 }}>/10</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-6 gap-2 text-center">
            <div className="col-span-2 bg-background-dark/40 rounded-lg py-2">
              <p style={{ fontSize: 11 }} className="uppercase tracking-wider text-slate-500 font-semibold">Dose</p>
              <p style={{ fontSize: 16, fontWeight: 600 }} className="text-slate-200 mt-0.5">{brew.coffeeGrams}g</p>
            </div>
            <div className="col-span-2 bg-background-dark/40 rounded-lg py-2">
              <p style={{ fontSize: 11 }} className="uppercase tracking-wider text-slate-500 font-semibold">Water</p>
              <p style={{ fontSize: 16, fontWeight: 600 }} className="text-slate-200 mt-0.5">{brew.waterMl}ml</p>
            </div>
            <div className="col-span-2 bg-background-dark/40 rounded-lg py-2">
              <p style={{ fontSize: 11 }} className="uppercase tracking-wider text-slate-500 font-semibold">Temp</p>
              <p style={{ fontSize: 16, fontWeight: 600 }} className="text-slate-200 mt-0.5">{brew.waterTempC ? `${brew.waterTempC}°C` : "—"}</p>
            </div>
            <div className="col-span-3 bg-background-dark/40 rounded-lg py-2">
              <p style={{ fontSize: 11 }} className="uppercase tracking-wider text-slate-500 font-semibold">Grind</p>
              <p style={{ fontSize: 16, fontWeight: 600 }} className="text-slate-200 mt-0.5">
                {brew.grinderClicks ? `${brew.grinderClicks} clicks` : brew.grindSize}
              </p>
            </div>
            <div className="col-span-3 bg-background-dark/40 rounded-lg py-2">
              <p style={{ fontSize: 11 }} className="uppercase tracking-wider text-slate-500 font-semibold">Brew Time</p>
              <p style={{ fontSize: 16, fontWeight: 600 }} className="text-slate-200 mt-0.5">{brew.brewTime || "—"}</p>
            </div>
          </div>
        </div>

        {/* Symptoms + Goals — animated exit, removed from DOM after animation */}
        {showSelectionUI && (
          <>
            <div style={{ marginTop: 28, ...exitStyle }}>
              {isOscillating ? (
                <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4 text-sm text-slate-300">
                  Keep brew inputs consistent for 2–3 brews before making new changes.
                </div>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-widest text-primary/70" style={{ marginBottom: 10 }}>What do you want to fix?</p>
                  <SymptomPicker selected={selectedSymptoms} onToggle={toggleSymptom} />
                </>
              )}
            </div>

            {!isOscillating && (
              <div style={{ marginTop: 28, ...exitStyle }}>
                <p className="text-xs uppercase tracking-widest text-primary/70" style={{ marginBottom: 10 }}>Set a goal</p>
                <GoalPicker selected={selectedGoals} maxSelections={1} onToggle={toggleGoal} />
              </div>
            )}
          </>
        )}

        {/* 10/10 perfect brew — already saved */}
        {isPerfect && isAlreadyFavourite && (
          <div className="mt-4 rounded-2xl bg-primary/10 border border-primary/30 p-5 text-center space-y-3">
            <span className="material-symbols-outlined text-primary text-4xl">star</span>
            <p className="font-bold text-slate-100 text-lg">Excellent brew!</p>
          </div>
        )}

        {/* 10/10 perfect brew — not yet saved */}
        {isPerfect && !isAlreadyFavourite && !isLocked && (
          <div className="mt-4 rounded-2xl bg-primary/10 border border-primary/30 p-5 text-center space-y-3">
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

        {/* ── Kapi coaching bubble ─────────────────────────────────────────── */}
        {showCoachBubble && (
          <div
            ref={coachingRef}
            className="mt-4 flex items-start gap-3"
            style={{
              opacity: coachBubbleVisible ? 1 : 0,
              transform: coachBubbleVisible ? "translateX(0)" : "translateX(-20px)",
              transition: "opacity 350ms ease-out, transform 350ms ease-out",
              willChange: coachBubbleVisible ? "auto" : "opacity, transform",
            }}
          >
            <img
              src={coachIsThinking ? "/coach/coffee_coach_thinking.png" : "/coach/coffee_coach_whispering.png"}
              alt="Coach Kapi"
              width={56}
              height={56}
              className="shrink-0"
              style={{ mixBlendMode: "screen" }}
            />
            <div
              className="chat-bubble-tail relative flex-1 p-4"
              style={{ background: "#2a1a0a", border: "1px solid rgba(244,157,37,0.3)", borderRadius: "4px 16px 16px 16px" }}
            >
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: "#f49d25" }}>
                Coach Kapi
              </p>

              {coachIsThinking ? (
                <div className="flex gap-2 items-center py-1">
                  <span className="thinking-dot thinking-dot-1" />
                  <span className="thinking-dot thinking-dot-2" />
                  <span className="thinking-dot thinking-dot-3" />
                </div>
              ) : (
                <>
                  <p className="text-base font-medium text-slate-100 leading-relaxed">
                    {displayedText}
                    {showCursor && <span className="typewriter-cursor">|</span>}
                  </p>
                  {response?.freshness_caveat && (
                    <p className="mt-2 text-xs text-slate-400">Freshness note: {response.freshness_caveat}</p>
                  )}
                  {response?.changes && (
                    <div
                      style={{
                        opacity: effectiveShowAdjustments ? 1 : 0,
                        transform: effectiveShowAdjustments ? "translateY(0)" : "translateY(8px)",
                        transition: "opacity 400ms ease-out, transform 400ms ease-out",
                        willChange: effectiveShowAdjustments ? "auto" : "opacity, transform",
                      }}
                    >
                      <CoachingChanges changes={response.changes} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── User reply bubble ────────────────────────────────────────────── */}
        {!isPerfect && showCoachBubble && !coachIsThinking && (
          <div
            ref={userBubbleRef}
            className="mt-4 flex items-center justify-end gap-3"
            style={{
              opacity: effectiveUserBubbleSlideIn ? 1 : 0,
              transform: effectiveUserBubbleSlideIn ? "translateX(0)" : "translateX(20px)",
              transition: "opacity 300ms ease-out, transform 300ms ease-out",
              willChange: effectiveUserBubbleSlideIn ? "auto" : "opacity, transform",
            }}
          >
            <div
              className="user-bubble-tail relative"
              style={{ background: "#1e1e2e", border: "1.5px solid rgba(244,157,37,0.5)", borderRadius: "16px 16px 4px 16px", padding: "10px 14px" }}
            >
              <span className="text-slate-100" style={{ fontSize: 14 }}>
                {displayedUserText}
                {showUserCursor && <span className="typewriter-cursor">|</span>}
              </span>
            </div>
            {userAvatar ? (
              <img src={userAvatar} alt="You" width={36} height={36} className="rounded-full shrink-0 object-cover" />
            ) : (
              <div className="rounded-full shrink-0 flex items-center justify-center text-sm font-bold"
                style={{ width: 36, height: 36, background: "#2a1a0a", border: "1px solid rgba(244,157,37,0.3)", color: "#f49d25" }}>
                {userInitial}
              </div>
            )}
          </div>
        )}

        {/* ── Kapi reply bubble with CTA ───────────────────────────────────── */}
        {!isPerfect && showCoachBubble && !coachIsThinking && (
          <div
            ref={kapiReplyRef}
            className="mt-4 flex items-start gap-3"
            style={{
              opacity: effectiveKapiReplyVisible ? 1 : 0,
              transform: effectiveKapiReplyVisible ? "translateX(0)" : "translateX(-20px)",
              transition: "opacity 300ms ease-out, transform 300ms ease-out",
              willChange: effectiveKapiReplyVisible ? "auto" : "opacity, transform",
            }}
          >
            <img
              src="/coach/coffee_coach_excited.png"
              alt="Coach Kapi"
              width={48}
              height={48}
              className="shrink-0"
              style={{ mixBlendMode: "screen" }}
            />
            <div
              className="chat-bubble-tail relative flex-1"
              style={{ background: "#2a1a0a", border: "1px solid rgba(244,157,37,0.3)", borderRadius: "4px 16px 16px 16px", padding: "12px 14px" }}
            >
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: "#f49d25" }}>Coach Kapi</p>

              {kapiReplyThinking ? (
                <div className="flex gap-2 items-center py-1">
                  <span className="thinking-dot thinking-dot-1" />
                  <span className="thinking-dot thinking-dot-2" />
                  <span className="thinking-dot thinking-dot-3" />
                </div>
              ) : (
                <>
                  <p className="text-slate-100 mb-2.5" style={{ fontSize: 14, fontWeight: 500 }}>
                    {displayedKapiReplyText}
                    {showKapiReplyCursor && <span className="typewriter-cursor">|</span>}
                  </p>
                  <div
                    style={{
                      opacity: effectiveShowCtaBtn ? 1 : 0,
                      animation: ctaBtnAnimate
                        ? "ctaPop 500ms ease-out forwards, ctaPulse 600ms ease-in-out 500ms 1 forwards"
                        : undefined,
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleBrewWithCoach}
                      className="cta-press w-full flex items-center justify-center gap-2 font-bold"
                      style={{ background: "#f49d25", color: "#1a0f00", borderRadius: 10, padding: "10px 16px", fontSize: 14 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>coffee_maker</span>
                      Brew with coach&apos;s help
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Escalation warning */}
        {response?.escalation && (
          <div className="mt-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-amber-400 text-base shrink-0 mt-0.5">lightbulb</span>
              <div>
                <p className="text-xs uppercase tracking-widest text-amber-400/80 font-semibold mb-1">Coach Suggestion</p>
                <p className="text-sm text-amber-100 leading-relaxed">{response.escalation.message}</p>
              </div>
            </div>
            {response.escalation.type === "recipe" && response.escalation.suggested_recipe_id && (
              <button type="button" onClick={() => router.push(`/log-brew/guided/${response.escalation!.suggested_recipe_id}`)}
                className="w-full h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber-500/30 transition-colors">
                <span className="material-symbols-outlined text-sm">receipt_long</span>
                Try Suggested Recipe
              </button>
            )}
            {response.escalation.type === "beans" && (
              <button type="button" onClick={() => router.push("/my-beans")}
                className="w-full h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber-500/30 transition-colors">
                <span className="material-symbols-outlined text-sm">eco</span>
                Browse Your Beans
              </button>
            )}
          </div>
        )}

        {/* Brew this again */}
        {isPerfect && isAlreadyFavourite && (
          <button type="button" onClick={handleBrewWithCoach}
            className="mt-4 w-full h-12 rounded-xl bg-primary text-background-dark font-bold text-base flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">coffee_maker</span>
            Brew this again
          </button>
        )}

        {/* Done / Skip */}
        {isPerfect && !isAlreadyFavourite && !isLocked && (
          <button onClick={() => router.push("/coach")}
            className={`mt-4 w-full h-12 rounded-xl font-bold text-base ${isFavouriteSaved ? "bg-primary text-background-dark" : "border border-primary/30 text-primary"}`}>
            {isFavouriteSaved ? "Done" : "Skip for Now"}
          </button>
        )}
      </div>

      {/* ── Fixed Get Coaching button — spring reveal on any pill selection ── */}
      {showGetCoachingBtn && (
        <div className="fixed bottom-36 left-0 right-0 max-w-phone mx-auto z-20 px-4">
          {/* Gradient fade above button */}
          <div style={{ height: 60, background: "linear-gradient(to bottom, transparent, #1a0f00)", pointerEvents: "none", marginBottom: -4 }} />
          <button
            onClick={handleGetCoaching}
            disabled={animPhase === "exiting" || isLoading}
            className="w-full h-12 rounded-xl font-bold text-base"
            style={{
              backgroundColor: '#f49d25',
              color: '#1a0f00',
              opacity: anySelected ? 1 : 0,
              transform: anySelected ? "translateY(0)" : "translateY(80px)",
              transition: anySelected
                ? "opacity 400ms cubic-bezier(0.34, 1.56, 0.64, 1), transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)"
                : "opacity 250ms ease-in, transform 250ms ease-in",
              willChange: "opacity, transform",
              pointerEvents: anySelected ? "auto" : "none",
            }}
          >
            Get Coaching
          </button>
        </div>
      )}
    </main>
  );
}
