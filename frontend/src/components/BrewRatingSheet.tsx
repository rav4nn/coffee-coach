"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CoachingResponse } from "@/components/CoachingResponse";
import { GoalPicker } from "@/components/GoalPicker";
import { RatingSlider } from "@/components/RatingSlider";
import { SymptomPicker } from "@/components/SymptomPicker";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { postCoachingApi, postFavouriteBrewApi, type CoachingResponseApi } from "@/lib/api";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";

interface BrewRatingSheetProps {
  brewId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRating?: number | null;
  initialFeedback?: string | null;
  initialTastingNotes?: string[] | null;
}

export function BrewRatingSheet({
  brewId,
  open,
  onOpenChange,
  initialRating,
  initialFeedback,
  initialTastingNotes,
}: BrewRatingSheetProps) {
  const router = useRouter();
  const updateEntry = useBrewHistoryStore((state) => state.updateEntry);

  const [rating, setRating] = useState<number>(initialRating ?? 6);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [response, setResponse] = useState<CoachingResponseApi | null>(
    initialFeedback ? { fix: initialFeedback } : null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [dotCount, setDotCount] = useState(1);
  const [isSavingFavourite, setIsSavingFavourite] = useState(false);
  const [isFavouriteSaved, setIsFavouriteSaved] = useState(false);

  useEffect(() => {
    if (!isThinking) return;
    const t = setInterval(() => setDotCount((d) => (d >= 3 ? 1 : d + 1)), 400);
    return () => clearInterval(t);
  }, [isThinking]);

  // Reset state when the brew changes
  useEffect(() => {
    setRating(initialRating ?? 6);
    setSelectedSymptoms([]);
    setSelectedGoals([]);
    setResponse(initialFeedback ? { fix: initialFeedback } : null);
    setIsLoading(false);
    setIsSavingFavourite(false);
    setIsFavouriteSaved(false);
  }, [brewId, initialRating, initialFeedback, initialTastingNotes]);

  // Lock the sheet once coaching has been received (free tier: one coaching per brew)
  const isLocked = !!initialFeedback;
  const isPerfect = rating === 10;
  const isOscillating = response?.trend === "oscillating";

  function handleRatingChange(value: number) {
    setRating(value);
    if (brewId) {
      void updateEntry(brewId, { rating: value });
    }
  }

  async function requestCoaching(payload: { symptoms?: string[]; goals?: string[] }) {
    if (!brewId) return;
    setIsLoading(true);
    try {
      const data = await postCoachingApi({ brew_id: brewId, ...payload });
      setResponse(data);
      void updateEntry(brewId, { rating, coachingFeedback: data.fix });
    } finally {
      setIsLoading(false);
    }
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
    else if (selectedGoals.length > 0) payload.goals = selectedGoals;
    if (!Object.keys(payload).length) return;

    setIsThinking(true);
    const startTime = Date.now();
    try {
      await requestCoaching(payload);
      const remaining = Math.max(0, 2000 - (Date.now() - startTime));
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
      onOpenChange(false);
      router.push(`/coach/brew/${brewId}`);
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

  const canGetCoaching =
    !isLocked &&
    !isPerfect &&
    !response?.fix &&
    (selectedSymptoms.length > 0 || selectedGoals.length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="h-[85dvh] overflow-hidden bg-[#1a0f00] border-t border-primary/20 text-slate-100 rounded-t-3xl px-0 pt-0 pb-0 flex flex-col">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        <SheetTitle className="sr-only">Rate Your Brew</SheetTitle>

        {/* Fixed header */}
        <div className="px-6 pt-4 pb-2 flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">Coaching</p>
            <h2 className="text-2xl font-bold text-slate-100 mt-0.5">How was that brew?</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-slate-400 hover:text-slate-100"
            aria-label="Skip"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Scrollable body — fixed height so sheet never resizes */}
        <div className="flex-1 overflow-y-auto px-6 space-y-4 mt-2 pb-6">

          {/* Symptoms — above slider */}
          {!isLocked && !isPerfect && !response?.fix && (
            <div className="space-y-2">
              {isOscillating ? (
                <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4 text-sm text-slate-300">
                  Keep brew inputs consistent for 2–3 brews before making new changes.
                </div>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold">What do you want to fix?</p>
                  <SymptomPicker
                    selected={selectedSymptoms}
                    onToggle={(s) => {
                      setSelectedSymptoms((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                      );
                      setSelectedGoals([]);
                    }}
                  />
                </>
              )}
            </div>
          )}

          {/* Rating slider */}
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

          {/* Goals — below slider */}
          {!isLocked && !isPerfect && !response?.fix && !isOscillating && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold">Set a Goal</p>
              <GoalPicker
                selected={selectedGoals}
                maxSelections={1}
                onToggle={(g) => {
                  setSelectedGoals((current) => {
                    const exists = current.includes(g);
                    return exists ? [] : [g];
                  });
                  setSelectedSymptoms([]);
                }}
              />
            </div>
          )}

          {/* ── 10/10 perfect brew ── */}
          {!isLocked && isPerfect && (
            <div className="rounded-2xl bg-primary/10 border border-primary/30 p-5 text-center space-y-3">
              <span className="material-symbols-outlined text-primary text-4xl">star</span>
              <p className="font-bold text-slate-100 text-lg">Excellent brew!</p>
              <p className="text-sm text-slate-400">You've nailed this one. Save it so you can repeat it.</p>
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
                  {isSavingFavourite ? "Saving…" : "Save this Recipe"}
                </button>
              )}
            </div>
          )}

          {/* ── Locked: read-only feedback ── */}
          {isLocked && response?.fix && (
            <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4">
              <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold mb-2">Coach Says</p>
              <p className="text-sm text-slate-100 leading-relaxed">{response.fix}</p>
              {response.freshness_caveat && (
                <p className="mt-2 text-xs text-slate-400">Freshness note: {response.freshness_caveat}</p>
              )}
              <p className="mt-3 text-xs text-slate-500">Upgrade to Premium Coach to get personalised coaching on every brew.</p>
            </div>
          )}


          {/* Coaching response */}
          {!isLocked && (response?.fix || isLoading) && (
            <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4">
              <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold mb-2">Coach Says</p>
              {isLoading ? (
                <p className="text-sm text-slate-400 animate-pulse">Getting your coaching tip…</p>
              ) : (
                <>
                  <p className="text-sm text-slate-100 leading-relaxed">{response?.fix}</p>
                  {response?.freshness_caveat && (
                    <p className="mt-2 text-xs text-slate-400">Freshness note: {response.freshness_caveat}</p>
                  )}
                </>
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
              {isThinking ? `Coach Kapi is thinking${'.'.repeat(dotCount)}` : 'Get Coaching'}
            </button>
          )}

          {/* Done / Skip button */}
          {(!canGetCoaching || response?.fix) && !isPerfect && (
            <button
              onClick={() => onOpenChange(false)}
              className="w-full h-12 rounded-xl bg-primary text-background-dark font-bold text-base"
            >
              {response?.fix ? "Done" : "Skip for Now"}
            </button>
          )}

          {/* Done after saving favourite */}
          {isPerfect && !isLocked && (
            <button
              onClick={() => onOpenChange(false)}
              className={`w-full h-12 rounded-xl font-bold text-base ${isFavouriteSaved ? "bg-primary text-background-dark" : "border border-primary/30 text-primary"}`}
            >
              {isFavouriteSaved ? "Done" : "Skip for Now"}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
