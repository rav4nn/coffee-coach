"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { CoachingResponse } from "@/components/CoachingResponse";
import { GoalPicker } from "@/components/GoalPicker";
import { RatingSlider } from "@/components/RatingSlider";
import { SymptomPicker } from "@/components/SymptomPicker";
import { Button } from "@/components/ui/button";
import { postCoachingApi, postFavouriteBrewApi, type CoachingResponseApi } from "@/lib/api";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";

type ImprovementMode = "symptom" | "goal";

function coachingMode(rating: number) {
  if (rating <= 4) {
    return "diagnosis";
  }
  if (rating <= 6) {
    return "improvement";
  }
  if (rating <= 8) {
    return "refinement";
  }
  return "lock-in";
}

function CoachingPageContent() {
  const searchParams = useSearchParams();
  const brewIdFromQuery = searchParams.get("brew_id");
  const entries = useBrewHistoryStore((state) => state.entries);
  const updateEntry = useBrewHistoryStore((state) => state.updateEntry);

  const recentFirst = useMemo(() => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [entries]);
  const defaultBrewId = brewIdFromQuery ?? recentFirst[0]?.id ?? "";
  const [selectedBrewId, setSelectedBrewId] = useState(defaultBrewId);
  const selectedBrew = recentFirst.find((entry) => entry.id === selectedBrewId) ?? null;

  const [rating, setRating] = useState<number>(selectedBrew?.rating ?? 6);
  const [improvementMode, setImprovementMode] = useState<ImprovementMode>("goal");
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [response, setResponse] = useState<CoachingResponseApi | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveFavouriteMessage, setSaveFavouriteMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBrew) {
      return;
    }
    setRating(selectedBrew.rating ?? 6);
    setSelectedSymptom(null);
    setSelectedGoals([]);
    setResponse(null);
    setSaveFavouriteMessage(null);
  }, [selectedBrewId, selectedBrew]);

  const mode = coachingMode(rating);
  const isOscillating = response?.trend === "oscillating";

  async function requestCoaching(payload: { symptom?: string; goals?: string[] }) {
    if (!selectedBrew) {
      return;
    }

    setIsLoading(true);
    try {
      const data = await postCoachingApi({
        brew_id: selectedBrew.id,
        symptom: payload.symptom,
        goals: payload.goals,
      });
      setResponse(data);
      updateEntry(selectedBrew.id, {
        rating,
        coachingFeedback: data.fix,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveFavourite() {
    if (!selectedBrew) {
      return;
    }
    await postFavouriteBrewApi({ brew_id: selectedBrew.id });
    updateEntry(selectedBrew.id, { isFavourite: true });
    setSaveFavouriteMessage("Saved as favourite.");
  }

  function toggleGoal(goal: string, max = 2) {
    setSelectedGoals((current) => {
      const exists = current.includes(goal);
      let next = current;
      if (exists) {
        next = current.filter((item) => item !== goal);
      } else if (current.length < max) {
        next = [...current, goal];
      }

      if (mode === "refinement" || (mode === "improvement" && improvementMode === "goal")) {
        void requestCoaching({ goals: next });
      }
      return next;
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mocha/70">Coaching</p>
        <h1 className="font-serif text-4xl font-bold text-espresso">Refine Your Next Brew</h1>
      </div>

      {recentFirst.length === 0 ? (
        <div className="rounded-3xl border border-mocha/10 bg-steam p-4 text-sm text-mocha/80 shadow-card">
          No brews found. Log a brew first to unlock coaching.
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-mocha/10 bg-steam p-4 shadow-card">
            <label className="mb-2 block text-sm font-semibold text-espresso">Select Brew</label>
            <select
              value={selectedBrewId}
              onChange={(event) => setSelectedBrewId(event.target.value)}
              className="h-10 w-full rounded-xl border border-mocha/20 bg-cream px-3 text-sm text-espresso outline-none focus:ring-2 focus:ring-mocha/40"
            >
              {recentFirst.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {new Date(entry.createdAt).toLocaleDateString("en-IN")} - {entry.methodId ?? "method"}
                </option>
              ))}
            </select>
          </div>

          <RatingSlider
            value={rating}
            onChange={(value) => {
              setRating(value);
              if (selectedBrew) {
                updateEntry(selectedBrew.id, { rating: value });
              }
            }}
          />

          {mode === "diagnosis" ? (
            <SymptomPicker
              selected={selectedSymptom}
              onSelect={(symptom) => {
                setSelectedSymptom(symptom);
                void requestCoaching({ symptom });
              }}
            />
          ) : null}

          {mode === "improvement" ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={improvementMode === "symptom" ? "default" : "outline"}
                  onClick={() => setImprovementMode("symptom")}
                >
                  Use symptom
                </Button>
                <Button variant={improvementMode === "goal" ? "default" : "outline"} onClick={() => setImprovementMode("goal")}>
                  Use goal
                </Button>
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
                <div className="rounded-2xl border border-mocha/10 bg-steam p-4 text-sm text-mocha/85">
                  Keep brew inputs consistent for 2-3 brews before making new changes.
                </div>
              ) : (
                <GoalPicker selected={selectedGoals} maxSelections={2} onToggle={(goal) => toggleGoal(goal, 2)} />
              )}
            </div>
          ) : null}

          {mode === "refinement" ? (
            isOscillating ? (
              <div className="rounded-2xl border border-mocha/10 bg-steam p-4 text-sm text-mocha/85">
                Trend is oscillating. Repeat the same recipe and workflow for consistency.
              </div>
            ) : (
              <GoalPicker selected={selectedGoals} maxSelections={2} onToggle={(goal) => toggleGoal(goal, 2)} />
            )
          ) : null}

          {mode === "lock-in" ? (
            <div className="rounded-3xl border border-mocha/10 bg-steam p-4 shadow-card">
              <p className="font-serif text-2xl font-bold text-espresso">Great brew. Lock it in.</p>
              <p className="mt-1 text-sm text-mocha/80">Save this brew as a favourite and repeat the same setup.</p>
              <Button className="mt-3" onClick={saveFavourite}>
                Save as Favourite
              </Button>
              {saveFavouriteMessage ? <p className="mt-2 text-sm text-mocha/80">{saveFavouriteMessage}</p> : null}
            </div>
          ) : null}

          <CoachingResponse
            fix={response?.fix}
            freshnessCaveat={response?.freshness_caveat}
            trend={response?.trend}
          />

          {isLoading ? <p className="text-sm text-mocha/70">Getting coaching feedback...</p> : null}
        </>
      )}
    </section>
  );
}

export default function CoachingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-mocha/80">Loading coaching...</p>}>
      <CoachingPageContent />
    </Suspense>
  );
}
