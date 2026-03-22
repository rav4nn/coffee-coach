"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

import { GoalPicker } from "@/components/GoalPicker";
import { RatingSlider } from "@/components/RatingSlider";
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
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-normal">Suggested adjustments</p>
      {displayable.map((change, i) => (
        <div key={i} className="flex items-center justify-between gap-2">
          <span className="text-xs font-normal text-slate-400">{PARAM_LABELS[change.param] ?? change.param}</span>
          <span className="text-xs font-normal text-primary">{formatChangeDisplay(change)}</span>
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

  const [rating, setRating] = useState<number>(5);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [response, setResponse] = useState<CoachingResponseApi | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingFavourite, setIsSavingFavourite] = useState(false);
  const [isFavouriteSaved, setIsFavouriteSaved] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userInitial, setUserInitial] = useState("U");
  const [ratingLocked, setRatingLocked] = useState(false);
  const [showSelections, setShowSelections] = useState(false);
  const [symptomsEntered, setSymptomsEntered] = useState(false);
  const [goalsEntered, setGoalsEntered] = useState(false);
  const [showPerfectCelebration, setShowPerfectCelebration] = useState(false);
  const [perfectCelebrationEntered, setPerfectCelebrationEntered] = useState(false);

  // ── Animation state ──────────────────────────────────────────────────────
  const [selectionExiting, setSelectionExiting] = useState(false);
  const [selectionHidden, setSelectionHidden] = useState(false);
  const [sequenceRunning, setSequenceRunning] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [coachBubbleVisible, setCoachBubbleVisible] = useState(false);
  const [coachBubbleEntered, setCoachBubbleEntered] = useState(false);
  const [coachIsThinking, setCoachIsThinking] = useState(false);
  const [coachAvatarSrc, setCoachAvatarSrc] = useState("/coach/coffee_coach_thinking.png");
  const [typewriterText, setTypewriterText] = useState("");
  const [showCursor, setShowCursor] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [adjustmentsEntered, setAdjustmentsEntered] = useState(false);

  const [userRequestBubbleVisible, setUserRequestBubbleVisible] = useState(false);
  const [userRequestBubbleEntered, setUserRequestBubbleEntered] = useState(false);
  const [userRequestText, setUserRequestText] = useState("");
  const [showUserRequestCursor, setShowUserRequestCursor] = useState(false);

  const [userBubbleVisible, setUserBubbleVisible] = useState(false);
  const [userBubbleEntered, setUserBubbleEntered] = useState(false);
  const [userBubbleText, setUserBubbleText] = useState("");
  const [showUserCursor, setShowUserCursor] = useState(false);

  const [kapiReplyVisible, setKapiReplyVisible] = useState(false);
  const [kapiReplyEntered, setKapiReplyEntered] = useState(false);
  const [kapiReplyThinking, setKapiReplyThinking] = useState(false);
  const [kapiReplyText, setKapiReplyText] = useState("");
  const [showKapiReplyCursor, setShowKapiReplyCursor] = useState(false);

  const [showCtaBtn, setShowCtaBtn] = useState(false);
  const [ctaBtnAnimate, setCtaBtnAnimate] = useState(false);
  const [showStatsBtn, setShowStatsBtn] = useState(false);
  const [statsBtnVisible, setStatsBtnVisible] = useState(false);

  const [titleIsAdvice, setTitleIsAdvice] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const coachingRef = useRef<HTMLDivElement>(null);
  const adjustmentsRef = useRef<HTMLDivElement>(null);
  const userRequestBubbleRef = useRef<HTMLDivElement>(null);
  const userRequestAvatarRef = useRef<HTMLDivElement>(null);
  const userBubbleRef = useRef<HTMLDivElement>(null);
  const userAvatarRef = useRef<HTMLDivElement>(null);
  const kapiReplyRef = useRef<HTMLDivElement>(null);
  const sliderSectionRef = useRef<HTMLDivElement>(null);
  const symptomsSectionRef = useRef<HTMLDivElement>(null);
  const goalsSectionRef = useRef<HTMLDivElement>(null);
  const perfectCelebrationRef = useRef<HTMLDivElement>(null);
  const getCoachingBtnRef = useRef<HTMLButtonElement>(null);
  // Prevents locked-brew animation from firing twice (StrictMode / re-renders)
  const hasStartedAnimation = useRef(false);
  const cancelled = useRef(false);
  const isAnimatingRef = useRef(false);
  const pendingWaits = useRef<Array<{ id: ReturnType<typeof setTimeout>; resolve: () => void }>>([]);

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

  useEffect(() => {
    hasStartedAnimation.current = false;
    clearSequenceState();
    resetRatingFlow();
  }, [brewId]);

  // Hydrate response state from existing brew data
  useEffect(() => {
    if (brew) {
      setRating(brew.rating ?? 5);
      setRatingLocked(brew.rating != null || !!brew.coachingFeedback);
      setShowSelections(brew.rating != null || !!brew.coachingFeedback);
      // If rated but not yet coached, show pickers immediately (no slide-in animation)
      if (brew.rating != null && !brew.coachingFeedback) {
        setSymptomsEntered(true);
        setGoalsEntered(true);
      }
      if (brew.coachingFeedback) {
        setResponse({
          fix: brew.coachingFeedback,
          changes: brew.coachingChanges ?? undefined,
        });
      }
    }
  }, [brew]);

  const isLocked = !!brew?.coachingFeedback;
  const hasStoredCoaching = !!brew?.coachingFeedback;
  const isPerfect = rating === 10;
  const isAlreadyFavourite = !!brew?.isFavourite;
  const isOscillating = response?.trend === "oscillating";

  function wait(ms: number) {
    return new Promise<void>((resolve) => {
      if (cancelled.current) {
        resolve();
        return;
      }
      const entry = {
        id: setTimeout(() => {
          pendingWaits.current = pendingWaits.current.filter((item) => item !== entry);
          resolve();
        }, ms),
        resolve,
      };
      pendingWaits.current.push(entry);
    });
  }

  function setElementWillChange(node: HTMLElement | null, active: boolean) {
    if (!node) return;
    node.style.willChange = active ? "opacity, transform" : "auto";
  }

  function clearSequenceState() {
    setSelectionExiting(false);
    setSelectionHidden(false);
    setSequenceRunning(false);
    setAnimationComplete(false);
    setTitleIsAdvice(false);
    setCoachBubbleVisible(false);
    setCoachBubbleEntered(false);
    setCoachIsThinking(false);
    setCoachAvatarSrc("/coach/coffee_coach_thinking.png");
    setTypewriterText("");
    setShowCursor(false);
    setShowAdjustments(false);
    setAdjustmentsEntered(false);
    setUserRequestBubbleVisible(false);
    setUserRequestBubbleEntered(false);
    setUserRequestText("");
    setShowUserRequestCursor(false);
    setUserBubbleVisible(false);
    setUserBubbleEntered(false);
    setUserBubbleText("");
    setShowUserCursor(false);
    setKapiReplyVisible(false);
    setKapiReplyEntered(false);
    setKapiReplyThinking(false);
    setKapiReplyText("");
    setShowKapiReplyCursor(false);
    setShowCtaBtn(false);
    setCtaBtnAnimate(false);
    setShowStatsBtn(false);
    setStatsBtnVisible(false);
  }

  function applyStaticAdviceState(result: CoachingResponseApi) {
    setSelectionExiting(false);
    setSelectionHidden(true);
    setSequenceRunning(false);
    setAnimationComplete(true);
    setTitleIsAdvice(true);
    setCoachBubbleVisible(true);
    setCoachBubbleEntered(true);
    setCoachIsThinking(false);
    setCoachAvatarSrc("/coach/coffee_coach_whispering.png");
    setTypewriterText(result.fix);
    setShowCursor(false);
    setShowAdjustments(true);
    setAdjustmentsEntered(true);
    setUserBubbleVisible(true);
    setUserBubbleEntered(true);
    setUserBubbleText("Help me brew this better.");
    setShowUserCursor(false);
    setKapiReplyVisible(true);
    setKapiReplyEntered(true);
    setKapiReplyThinking(false);
    setKapiReplyText("Sure, here you go!");
    setShowKapiReplyCursor(false);
    setShowCtaBtn(true);
    setCtaBtnAnimate(false);
    setShowStatsBtn(true);
    setStatsBtnVisible(true);
  }

  function resetRatingFlow() {
    setRatingLocked(false);
    setShowSelections(false);
    setSymptomsEntered(false);
    setGoalsEntered(false);
    setShowPerfectCelebration(false);
    setPerfectCelebrationEntered(false);
  }

  useEffect(() => {
    return () => {
      cancelled.current = true;
      isAnimatingRef.current = false;
      pendingWaits.current.forEach((entry) => {
        clearTimeout(entry.id);
        entry.resolve();
      });
      pendingWaits.current = [];
    };
  }, []);

  function handleRatingChange(value: number) {
    setRating(value);
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

  async function typeText(
    text: string,
    setText: (value: string) => void,
    msPerChar: number,
  ) {
    setText("");
    for (let i = 1; i <= text.length; i += 1) {
      if (cancelled.current) return;
      setText(text.slice(0, i));
      await wait(msPerChar);
    }
  }

  async function exitPillsAndSlider() {
    if (cancelled.current) return;
    [
      sliderSectionRef.current,
      symptomsSectionRef.current,
      goalsSectionRef.current,
      getCoachingBtnRef.current,
    ].forEach((node) => setElementWillChange(node, true));
    setSelectionExiting(true);
    await wait(300);
    [
      sliderSectionRef.current,
      symptomsSectionRef.current,
      goalsSectionRef.current,
      getCoachingBtnRef.current,
    ].forEach((node) => setElementWillChange(node, false));
    if (cancelled.current) return;
    setSelectionHidden(true);
    setSelectionExiting(false);
  }

  function buildUserRequestMessage(symptoms: string[], goals: string[]): string {
    const symText = symptoms.length === 0 ? "" :
      symptoms.length === 1 ? symptoms[0] :
      symptoms.slice(0, -1).join(", ") + " and " + symptoms[symptoms.length - 1];
    const goalText = goals.length > 0 ? goals[0] : "";
    if (symText && goalText) return `I had ${symText} in my cup. I want ${goalText} in my next brew.`;
    if (symText) return `I had ${symText} in my cup.`;
    if (goalText) return `I want ${goalText} in my next brew.`;
    return "Help me brew this better.";
  }

  async function showUserRequestBubble() {
    if (cancelled.current) return;
    setUserRequestBubbleVisible(true);
    await wait(16);
    setElementWillChange(userRequestBubbleRef.current, true);
    setElementWillChange(userRequestAvatarRef.current, true);
    setUserRequestBubbleEntered(true);
    userRequestBubbleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    await wait(350);
    setElementWillChange(userRequestBubbleRef.current, false);
    setElementWillChange(userRequestAvatarRef.current, false);
  }

  async function typewriterUserRequestText(text: string) {
    if (cancelled.current) return;
    await wait(150);
    if (cancelled.current) return;
    setShowUserRequestCursor(true);
    setUserRequestText("");
    for (let i = 1; i <= text.length; i += 1) {
      if (cancelled.current) return;
      setUserRequestText(text.slice(0, i));
      await wait(20);
    }
    await wait(300);
    setShowUserRequestCursor(false);
  }

  async function showKapiThinking() {
    if (cancelled.current) return;
    setCoachAvatarSrc("/coach/coffee_coach_thinking.png");
    setCoachBubbleVisible(true);
    setCoachIsThinking(true);
    await wait(16);
    setElementWillChange(coachingRef.current, true);
    setCoachBubbleEntered(true);
    coachingRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    await wait(350);
    setElementWillChange(coachingRef.current, false);
  }

  async function typewriterCoachingText(text: string) {
    if (cancelled.current) return;
    await wait(1500);
    if (cancelled.current) return;
    setCoachAvatarSrc("/coach/coffee_coach_whispering.png");
    setCoachIsThinking(false);
    setShowCursor(true);
    // Inline typewriter with periodic scroll-to-bottom so the viewport follows growing text
    setTypewriterText("");
    for (let i = 1; i <= text.length; i += 1) {
      if (cancelled.current) return;
      setTypewriterText(text.slice(0, i));
      if (i % 50 === 0) window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      await wait(18);
    }
    if (cancelled.current) return;
    await wait(400);
    for (let i = 0; i < 2; i += 1) {
      setShowCursor(false);
      await wait(400);
      if (cancelled.current) return;
      setShowCursor(true);
      await wait(400);
      if (cancelled.current) return;
    }
    setShowCursor(false);
  }

  async function revealSuggestedAdj() {
    if (cancelled.current) return;
    setShowAdjustments(true);
    await wait(16);
    setElementWillChange(adjustmentsRef.current, true);
    setAdjustmentsEntered(true);
    await wait(400);
    setElementWillChange(adjustmentsRef.current, false);
  }

  async function showUserBubble() {
    if (cancelled.current) return;
    setUserBubbleVisible(true);
    await wait(16);
    setElementWillChange(userBubbleRef.current, true);
    setElementWillChange(userAvatarRef.current, true);
    setUserBubbleEntered(true);
    userBubbleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    await wait(350);
    setElementWillChange(userBubbleRef.current, false);
    setElementWillChange(userAvatarRef.current, false);
  }

  async function typewriterUserText() {
    if (cancelled.current) return;
    await wait(200);
    if (cancelled.current) return;
    setShowUserCursor(true);
    await typeText("Help me brew this better.", setUserBubbleText, 20);
    if (cancelled.current) return;
    await wait(300);
    setShowUserCursor(false);
    await wait(300);
    setShowUserCursor(false);
  }

  async function showKapiReplyBubble() {
    if (cancelled.current) return;
    await wait(400);
    if (cancelled.current) return;
    setKapiReplyVisible(true);
    await wait(16);
    setElementWillChange(kapiReplyRef.current, true);
    setKapiReplyEntered(true);
    kapiReplyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    await wait(350);
    setElementWillChange(kapiReplyRef.current, false);
  }

  async function showKapiThinkingDots() {
    if (cancelled.current) return;
    setKapiReplyThinking(true);
    await wait(800);
    setKapiReplyThinking(false);
  }

  async function typewriterReplyText() {
    if (cancelled.current) return;
    setShowKapiReplyCursor(true);
    await typeText("Sure, here you go!", setKapiReplyText, 22);
    if (cancelled.current) return;
    await wait(300);
    setShowKapiReplyCursor(false);
  }

  async function springInCTAButton() {
    if (cancelled.current) return;
    await wait(150);
    if (cancelled.current) return;
    setShowCtaBtn(true);
    await wait(16);
    setCtaBtnAnimate(true);
    await wait(1000);
  }

  async function revealStatsButton() {
    if (cancelled.current) return;
    await wait(200);
    if (cancelled.current) return;
    setShowStatsBtn(true);
    await wait(16);
    setStatsBtnVisible(true);
    await wait(300);
  }

  async function runCoachingSequence(resultPromise: Promise<CoachingResponseApi | null>) {
    if (cancelled.current || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setSequenceRunning(true);
    setAnimationComplete(false);

    try {
      const requestMsg = buildUserRequestMessage(selectedSymptoms, selectedGoals);
      await exitPillsAndSlider();
      await showUserRequestBubble();
      await typewriterUserRequestText(requestMsg);
      await wait(400);
      await showKapiThinking();

      const data = await resultPromise;
      if (!data?.fix || cancelled.current) {
        clearSequenceState();
        return;
      }

      setTitleIsAdvice(true);
      await typewriterCoachingText(data.fix);
      await revealSuggestedAdj();
      await wait(100);
      await showUserBubble();
      await typewriterUserText();
      await showKapiReplyBubble();
      await showKapiThinkingDots();
      await typewriterReplyText();
      await springInCTAButton();
      await revealStatsButton();

      if (!cancelled.current) {
        if (brewId) {
          await updateEntry(brewId, {
            coached: true,
            coachingFeedback: data.fix,
            coachingChanges: data.changes ?? null,
          });
        }
        setAnimationComplete(true);
      }
    } finally {
      isAnimatingRef.current = false;
      if (!cancelled.current) {
        setSequenceRunning(false);
      }
    }
  }

  // ── For already-coached brews: render the final state immediately ────────
  useEffect(() => {
    if (
      dataLoaded &&
      hasStoredCoaching &&
      brew?.coachingFeedback &&
      !isPerfect &&
      !hasStartedAnimation.current
    ) {
      hasStartedAnimation.current = true;
      clearSequenceState();
      applyStaticAdviceState({
        fix: brew.coachingFeedback,
        changes: brew.coachingChanges ?? undefined,
      });
      if (brewId && brew.coached !== true) {
        void updateEntry(brewId, { coached: true });
      }
    }
  }, [dataLoaded, hasStoredCoaching, brew?.coachingFeedback, brew?.coachingChanges, brew?.coached, brewId, isPerfect, updateEntry]);

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
    if (isAnimatingRef.current) return;
    const payload: { symptoms?: string[]; goals?: string[] } = {};
    if (selectedSymptoms.length > 0) payload.symptoms = selectedSymptoms;
    if (selectedGoals.length > 0) payload.goals = selectedGoals;
    if (!Object.keys(payload).length) return;

    // Prevent the "already coached" hydration effect from restarting and
    // clearing the live sequence after this brew gets updated with feedback.
    hasStartedAnimation.current = true;
    clearSequenceState();
    const requestPromise = requestCoaching(payload);
    await runCoachingSequence(requestPromise);
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
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("coffee-coach-home-toast", "Added to your Best Brews! ☕");
      }
      router.push("/");
    } finally {
      setIsSavingFavourite(false);
    }
  }

  async function handleDoneRating() {
    if (ratingLocked || isLocked || isAnimatingRef.current) return;

    if (brewId) {
      await updateEntry(brewId, { rating });
    }
    setRatingLocked(true);

    if (rating === 10) {
      setShowPerfectCelebration(true);
      await wait(16);
      setPerfectCelebrationEntered(true);
      await wait(200);
      perfectCelebrationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setShowSelections(true);
    await wait(16);
    setSymptomsEntered(true);
    await wait(150);
    setGoalsEntered(true);
    await wait(50);
    symptomsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  function handleSeeBrewStats() {
    router.push("/history?view=stats");
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const anySelected = selectedSymptoms.length > 0 || selectedGoals.length > 0;
  const showSelectionUI =
    !selectionHidden &&
    !isLocked &&
    ratingLocked &&
    showSelections &&
    !showPerfectCelebration;
  const showGetCoachingBtn =
    !selectionHidden &&
    !isLocked &&
    ratingLocked &&
    showSelections &&
    !showPerfectCelebration;
  const displayedTitle = (isLocked || titleIsAdvice) ? "Coach's Advice" : "How was this brew?";
  const exitStyle = selectionExiting
    ? { opacity: 0, transform: "translateY(-12px)", transition: "opacity 300ms ease-out, transform 300ms ease-out" }
    : { opacity: 1, transform: "translateY(0)", transition: "opacity 300ms ease-out, transform 300ms ease-out" };

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
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }

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
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-normal">Coaching</p>
          <h1 className="text-2xl font-normal text-slate-100">{displayedTitle}</h1>
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
              <p className="text-sm font-normal text-slate-100 leading-snug" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                {beanName.length > 40 ? beanName.slice(0, 40) + "…" : beanName}
              </p>
              <p className="mt-0.5 text-xs font-normal text-slate-400">{methodLabel(brew.methodId)}</p>
            </div>
            {(ratingLocked || brew.rating != null) && (
              <div className="shrink-0 text-right leading-none">
                <span style={{ color: '#f49d25', fontSize: 20, fontWeight: 700 }}>{ratingLocked ? rating : brew.rating}</span>
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

        {!selectionHidden && (
          <div ref={sliderSectionRef} className="mt-5 mb-6" style={exitStyle}>
            <RatingSlider
              value={rating}
              onChange={handleRatingChange}
              disabled={isLocked || ratingLocked}
              locked={ratingLocked}
            />
            {!isLocked && !ratingLocked && (
              <button
                type="button"
                onClick={handleDoneRating}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-normal text-background-dark"
              >
                Done
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            )}
          </div>
        )}

        {/* Symptoms + Goals — exit-animated, then removed from DOM */}
        {showSelectionUI && (
          <>
            <div
              ref={symptomsSectionRef}
              style={{
                marginTop: 28,
                opacity: symptomsEntered ? 1 : 0,
                transform: symptomsEntered ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 400ms ease-out, transform 400ms ease-out",
              }}
            >
              {isOscillating ? (
                <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4 text-sm text-slate-300">
                  Keep brew inputs consistent for 2–3 brews before making new changes.
                </div>
              ) : (
                <>
                  <p className="text-xs font-normal uppercase tracking-widest text-primary/70" style={{ marginBottom: 10 }}>What do you want to fix?</p>
                  <SymptomPicker selected={selectedSymptoms} onToggle={toggleSymptom} />
                </>
              )}
            </div>
            {!isOscillating && (
              <div
                ref={goalsSectionRef}
                style={{
                  marginTop: 28,
                  opacity: goalsEntered ? 1 : 0,
                  transform: goalsEntered ? "translateY(0)" : "translateY(12px)",
                  transition: "opacity 400ms ease-out, transform 400ms ease-out",
                }}
              >
                <p className="text-xs font-normal uppercase tracking-widest text-primary/70" style={{ marginBottom: 10 }}>Set a goal</p>
                <GoalPicker selected={selectedGoals} maxSelections={1} onToggle={toggleGoal} />
              </div>
            )}
          </>
        )}

        {showPerfectCelebration && (
          <div
            ref={perfectCelebrationRef}
            className="mt-8 text-center"
            style={{
              opacity: perfectCelebrationEntered ? 1 : 0,
              transform: perfectCelebrationEntered ? "scale(1)" : "scale(0.8)",
              transition: "opacity 500ms ease-out, transform 500ms ease-out",
            }}
          >
            <div className="flex justify-center">
              <img
                src="/coach/coffee_coach_excited.png"
                alt="Coach Kapi celebrating"
                width={140}
                height={140}
                style={{ mixBlendMode: "screen" }}
              />
            </div>
            <h2 className="mt-3 text-[22px] font-normal text-slate-100">
              Perfect Brew! <span className="text-primary">✓</span>
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Coach Kapi is saving this to your Best Brews.
            </p>
            <button
              type="button"
              onClick={handleSaveFavourite}
              disabled={isSavingFavourite || isFavouriteSaved || isAlreadyFavourite}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-primary font-normal text-background-dark disabled:opacity-60"
            >
              {isSavingFavourite ? "Saving…" : isFavouriteSaved || isAlreadyFavourite ? "Saved to Best Brews" : "Save to Best Brews"}
            </button>
          </div>
        )}

        {/* ── BUBBLE 0: User request — symptoms + goals ────────────────────── */}
        {userRequestBubbleVisible && (
          <div className="mt-4 flex items-center justify-end gap-3" style={{ pointerEvents: "none" }}>
            <div
              ref={userRequestBubbleRef}
              className="user-bubble-tail relative"
              style={{
                background: "#1e1e2e",
                border: "1.5px solid rgba(244,157,37,0.5)",
                borderRadius: "16px 16px 4px 16px",
                padding: "10px 14px",
                maxWidth: "80%",
                opacity: userRequestBubbleEntered ? 1 : 0,
                transform: userRequestBubbleEntered ? "translateX(0)" : "translateX(16px)",
                transition: "opacity 350ms ease-out, transform 350ms ease-out",
              }}
            >
              <span className="text-slate-100" style={{ fontSize: 14, fontWeight: 400 }}>
                {userRequestText}
                {showUserRequestCursor && <span className="typewriter-cursor">|</span>}
              </span>
            </div>
            <div
              ref={userRequestAvatarRef}
              style={{ opacity: userRequestBubbleEntered ? 1 : 0, transition: "opacity 300ms ease-out" }}
            >
              {userAvatar ? (
                <img src={userAvatar} alt="You" width={36} height={36} className="rounded-full shrink-0 object-cover" />
              ) : (
                <div className="rounded-full shrink-0 flex items-center justify-center text-sm font-bold"
                  style={{ width: 36, height: 36, background: "#2a1a0a", border: "1px solid rgba(244,157,37,0.3)", color: "#f49d25" }}>
                  {userInitial}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BUBBLE 1: Kapi coaching — mounts at Phase 2, stays for all later phases ── */}
        {coachBubbleVisible && (
          <div
            ref={coachingRef}
            className="mt-4 flex items-start gap-3"
            style={{
              opacity: coachBubbleEntered ? 1 : 0,
              transform: coachBubbleEntered ? "translateX(0)" : "translateX(-16px)",
              transition: "opacity 350ms ease-out, transform 350ms ease-out",
            }}
          >
            <img
              src={coachAvatarSrc}
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
              <p className="text-[10px] uppercase tracking-wider font-normal mb-2" style={{ color: "#f49d25" }}>
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
                  <p className="text-base font-normal text-slate-100 leading-relaxed">
                    {typewriterText}
                    {showCursor && <span className="typewriter-cursor">|</span>}
                  </p>
                  {response?.freshness_caveat && (
                    <p className="mt-2 text-xs text-slate-400">Freshness note: {response.freshness_caveat}</p>
                  )}
                  {response?.changes && (
                    <div
                      ref={adjustmentsRef}
                      style={{
                        opacity: adjustmentsEntered ? 1 : 0,
                        transform: adjustmentsEntered ? "translateY(0)" : "translateY(6px)",
                        transition: "opacity 400ms ease-out, transform 400ms ease-out",
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

        {/* ── BUBBLE 2: User reply — mounts only at Phase 5 ───────────────────── */}
        {!isPerfect && userBubbleVisible && (
          <div
            className="mt-4 flex items-center justify-end gap-3"
            style={{ pointerEvents: "none" }}
          >
            <div
              ref={userBubbleRef}
              className="user-bubble-tail relative"
              style={{
                background: "#1e1e2e",
                border: "1.5px solid rgba(244,157,37,0.5)",
                borderRadius: "16px 16px 4px 16px",
                padding: "10px 14px",
                opacity: userBubbleEntered ? 1 : 0,
                transform: userBubbleEntered ? "translateX(0)" : "translateX(16px)",
                transition: "opacity 350ms ease-out, transform 350ms ease-out",
              }}
            >
              <span className="text-slate-100" style={{ fontSize: 14, fontWeight: 400 }}>
                {userBubbleText}
                {showUserCursor && <span className="typewriter-cursor">|</span>}
              </span>
            </div>
            <div
              ref={userAvatarRef}
              style={{
                opacity: userBubbleEntered ? 1 : 0,
                transition: "opacity 300ms ease-out",
              }}
            >
              {userAvatar ? (
                <img src={userAvatar} alt="You" width={36} height={36} className="rounded-full shrink-0 object-cover" />
              ) : (
                <div className="rounded-full shrink-0 flex items-center justify-center text-sm font-bold"
                  style={{ width: 36, height: 36, background: "#2a1a0a", border: "1px solid rgba(244,157,37,0.3)", color: "#f49d25" }}>
                  {userInitial}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BUBBLE 3: Kapi reply + CTA — mounts only at Phase 6 ─────────────── */}
        {!isPerfect && kapiReplyVisible && (
          <div
            ref={kapiReplyRef}
            className="mt-4 flex items-start gap-3"
            style={{
              opacity: kapiReplyEntered ? 1 : 0,
              transform: kapiReplyEntered ? "translateX(0)" : "translateX(-16px)",
              transition: "opacity 350ms ease-out, transform 350ms ease-out",
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
              <p className="text-[10px] uppercase tracking-wider font-normal mb-1" style={{ color: "#f49d25" }}>Coach Kapi</p>
              {kapiReplyThinking ? (
                <div className="flex gap-2 items-center py-1">
                  <span className="thinking-dot thinking-dot-1" />
                  <span className="thinking-dot thinking-dot-2" />
                  <span className="thinking-dot thinking-dot-3" />
                </div>
              ) : (
                <>
                  <p className="text-slate-100 mb-2.5" style={{ fontSize: 14, fontWeight: 400 }}>
                    {kapiReplyText}
                    {showKapiReplyCursor && <span className="typewriter-cursor">|</span>}
                  </p>
                  {showCtaBtn && (
                    <div
                      style={{
                        animation: ctaBtnAnimate
                          ? "ctaPop 500ms ease-out forwards, ctaPulse 600ms ease-in-out 500ms 1 forwards"
                          : undefined,
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleBrewWithCoach}
                        disabled={!animationComplete}
                        className="cta-press w-full flex items-center justify-center gap-2 font-normal"
                        style={{
                          background: "#f49d25",
                          color: "#1a0f00",
                          borderRadius: 10,
                          padding: "10px 16px",
                          fontSize: 14,
                          pointerEvents: animationComplete ? "auto" : "none",
                          opacity: animationComplete ? 1 : 0.98,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>coffee_maker</span>
                        Brew with coach&apos;s help
                      </button>
                    </div>
                  )}
                  {showStatsBtn && (
                    <button
                      type="button"
                      onClick={handleSeeBrewStats}
                      disabled={!animationComplete}
                      className="mt-3 w-full rounded-xl border bg-transparent px-4 py-3 text-center font-normal"
                      style={{
                        borderColor: "rgba(255,255,255,0.18)",
                        color: "rgba(255,255,255,0.6)",
                        fontSize: 14,
                        opacity: statsBtnVisible ? 1 : 0,
                        transition: "opacity 300ms ease-out",
                        pointerEvents: animationComplete ? "auto" : "none",
                        marginBottom: 24,
                      }}
                    >
                      See Brew Stats →
                    </button>
                  )}
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
        {isPerfect && isAlreadyFavourite && isLocked && (
          <button type="button" onClick={handleBrewWithCoach}
            className="mt-4 w-full h-12 rounded-xl bg-primary text-background-dark font-bold text-base flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">coffee_maker</span>
            Brew this again
          </button>
        )}
      </div>

      {/* ── Fixed Get Coaching button — spring reveal on any pill selection ── */}
      {showGetCoachingBtn && (
        <div
          className="fixed bottom-36 left-0 right-0 max-w-phone mx-auto z-20 px-4"
          style={{ pointerEvents: "none" }}
        >
          <button
            ref={getCoachingBtnRef}
            onClick={handleGetCoaching}
            disabled={selectionExiting || isLoading || sequenceRunning}
            className="w-full h-12 rounded-xl font-bold text-base"
            style={{
              backgroundColor: '#f49d25',
              color: '#1a0f00',
              opacity: selectionExiting ? 0 : anySelected ? 1 : 0,
              transform: selectionExiting ? "translateY(-12px)" : anySelected ? "translateY(0)" : "translateY(80px)",
              transition: selectionExiting
                ? "opacity 300ms ease-out, transform 300ms ease-out"
                : anySelected
                  ? "opacity 400ms cubic-bezier(0.34, 1.56, 0.64, 1), transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)"
                  : "opacity 250ms ease-in, transform 250ms ease-in",
              pointerEvents: anySelected && !selectionExiting && !sequenceRunning ? "auto" : "none",
            }}
          >
            Get Coaching
          </button>
        </div>
      )}

      {sequenceRunning && !animationComplete && (
        <div className="fixed inset-0 z-30" aria-hidden="true" />
      )}
    </main>
  );
}
