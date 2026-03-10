"use client";

import { useEffect, useState } from "react";

import { CoachingResponse } from "@/components/CoachingResponse";
import { GoalPicker } from "@/components/GoalPicker";
import { RatingSlider } from "@/components/RatingSlider";
import { SymptomPicker } from "@/components/SymptomPicker";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { postCoachingApi, type CoachingResponseApi } from "@/lib/api";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";

type ImprovementMode = "symptom" | "goal";

function coachingMode(rating: number) {
  if (rating <= 4) return "diagnosis";
  if (rating <= 6) return "improvement";
  if (rating <= 8) return "refinement";
  return "lock-in";
}

interface BrewRatingSheetProps {
  brewId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRating?: number | null;
  initialFeedback?: string | null;
}

export function BrewRatingSheet({
  brewId,
  open,
  onOpenChange,
  initialRating,
  initialFeedback,
}: BrewRatingSheetProps) {
  const updateEntry = useBrewHistoryStore((state) => state.updateEntry);

  const [rating, setRating] = useState<number>(initialRating ?? 6);
  const [improvementMode, setImprovementMode] = useState<ImprovementMode>("goal");
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [response, setResponse] = useState<CoachingResponseApi | null>(
    initialFeedback ? { fix: initialFeedback } : null,
  );
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when the brew changes
  useEffect(() => {
    setRating(initialRating ?? 6);
    setImprovementMode("goal");
    setSelectedSymptom(null);
    setSelectedGoals([]);
    setResponse(initialFeedback ? { fix: initialFeedback } : null);
    setIsLoading(false);
  }, [brewId, initialRating, initialFeedback]);

  // Lock the sheet once coaching has been received (free tier: one coaching per brew)
  const isLocked = !!initialFeedback;

  const mode = coachingMode(rating);
  const isOscillating = response?.trend === "oscillating";

  function handleRatingChange(value: number) {
    setRating(value);
    if (brewId) {
      void updateEntry(brewId, { rating: value });
    }
  }

  async function requestCoaching(payload: { symptom?: string; goals?: string[] }) {
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
      const next = exists ? current.filter((g) => g !== goal) : current.length < 2 ? [...current, goal] : current;
      if (mode === "refinement" || (mode === "improvement" && improvementMode === "goal")) {
        void requestCoaching({ goals: next });
      }
      return next;
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto max-h-[85dvh] bg-[#1a0f00] border-t border-primary/20 text-slate-100 rounded-t-3xl px-0 pt-0 pb-10">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        <SheetTitle className="sr-only">Rate Your Brew</SheetTitle>

        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
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

        <div className="px-6 space-y-4 mt-2">
          {/* Rating */}
          <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-100">Rate This Brew</p>
              <span className="text-primary font-bold text-lg">{rating}<span className="text-xs text-slate-400">/10</span></span>
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

          {/* Locked: show read-only feedback, no pickers */}
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

          {/* Coaching pickers — only shown when not locked */}
          {!isLocked && mode === "diagnosis" && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold">What went wrong?</p>
              <SymptomPicker
                selected={selectedSymptom}
                onSelect={(symptom) => {
                  setSelectedSymptom(symptom);
                  void requestCoaching({ symptom });
                }}
              />
            </div>
          )}

          {!isLocked && mode === "improvement" && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold">Diagnose or improve?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImprovementMode("symptom")}
                  className={`flex-1 h-9 rounded-xl text-sm font-semibold border transition-colors ${
                    improvementMode === "symptom"
                      ? "bg-primary text-background-dark border-primary"
                      : "bg-primary/10 text-primary/80 border-primary/20"
                  }`}
                >
                  Fix a symptom
                </button>
                <button
                  type="button"
                  onClick={() => setImprovementMode("goal")}
                  className={`flex-1 h-9 rounded-xl text-sm font-semibold border transition-colors ${
                    improvementMode === "goal"
                      ? "bg-primary text-background-dark border-primary"
                      : "bg-primary/10 text-primary/80 border-primary/20"
                  }`}
                >
                  Set a goal
                </button>
              </div>
              {improvementMode === "symptom" ? (
                <SymptomPicker
                  selected={selectedSymptom}
                  onSelect={(symptom) => {
                    setSelectedSymptom(symptom);
                    void requestCoaching({ symptom });
                  }}
                />
              ) : isOscillating ? (
                <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4 text-sm text-slate-300">
                  Keep brew inputs consistent for 2–3 brews before making new changes.
                </div>
              ) : (
                <GoalPicker selected={selectedGoals} maxSelections={2} onToggle={toggleGoal} />
              )}
            </div>
          )}

          {!isLocked && mode === "refinement" && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-primary/70 font-semibold">Refine your brew</p>
              {isOscillating ? (
                <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4 text-sm text-slate-300">
                  Trend is oscillating. Repeat the same recipe for consistency before tweaking.
                </div>
              ) : (
                <GoalPicker selected={selectedGoals} maxSelections={2} onToggle={toggleGoal} />
              )}
            </div>
          )}

          {!isLocked && mode === "lock-in" && (
            <div className="rounded-2xl bg-primary/10 border border-primary/30 p-4 text-center">
              <span className="material-symbols-outlined text-primary text-3xl">star</span>
              <p className="font-bold text-slate-100 mt-1">Excellent brew!</p>
              <p className="text-xs text-slate-400 mt-1">Head to the Coaching tab to lock this in as a favourite.</p>
            </div>
          )}

          {/* Coaching response (unlocked only — locked case rendered above) */}
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

          {/* Done button */}
          <button
            onClick={() => onOpenChange(false)}
            className="w-full h-12 rounded-xl bg-primary text-background-dark font-bold text-base"
          >
            {response?.fix ? "Done" : "Skip for Now"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
