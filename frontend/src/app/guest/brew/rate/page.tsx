"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { CompactFlowHeader } from "@/components/CompactFlowHeader";
import { RatingSlider } from "@/components/RatingSlider";
import { useGuestBrewStore } from "@/lib/guestBrewStore";

const RATING_LABELS: Record<number, string> = {
  1: "Awful — nearly undrinkable",
  2: "Really rough",
  3: "Pretty bad",
  4: "Below average",
  5: "Meh, it was okay",
  6: "Decent, not great",
  7: "Pretty good actually",
  8: "Really good",
  9: "Almost perfect",
  10: "Perfect cup!",
};

export default function GuestBrewStep3() {
  const router = useRouter();
  const store = useGuestBrewStore();
  const [rating, setRating] = useState(store.rating);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dotCount, setDotCount] = useState(1);

  // Thinking dots animation
  function startThinking() {
    setIsLoading(true);
    const interval = setInterval(() => {
      setDotCount((d) => (d % 3) + 1);
    }, 400);
    return interval;
  }

  async function handleGetCoaching() {
    setError(null);
    const interval = startThinking();

    store.setRating(rating);

    const payload = {
      method_id: store.methodId,
      symptoms: store.symptoms,
      goals: store.goals,
      rating,
      coffee_grams: store.coffeeGrams,
      water_ml: store.waterMl,
      water_temp_c: store.waterTempC,
      grind_size: store.grindSize,
      grind_clicks: store.grindClicks,
      brew_time: store.brewTime,
      grinder_name: store.grinderName,
    };

    try {
      const res = await fetch("/api/coaching/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        setError("You've used all your free coaching for this hour. Try again later!");
        return;
      }

      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }

      const data = await res.json();
      store.setCoachingResult(data);
      router.push("/guest/coaching");
    } catch {
      setError("Couldn't reach the coach. Check your connection and try again.");
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  }

  return (
    <main className="overflow-y-auto pb-28">
      <CompactFlowHeader
        title="Fix My Brew"
        onBack={() => router.back()}
        showProgress
        progressCount={3}
        currentStep={3}
      />

      <div className="px-4 pt-6 space-y-6">
        {/* Kapi illustration */}
        <div className="flex justify-center">
          <div className="w-40 h-40">
            <Image
              src="/coach/coffee_coach_thinking.png"
              alt="Coach Kapi"
              width={160}
              height={160}
              className="w-full h-full object-contain"
              style={{ mixBlendMode: "screen" }}
              priority
            />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-100 mb-1">
            How was your cup?
          </h2>
          <p className="text-sm text-slate-400">
            This helps the coach decide how much to adjust.
          </p>
        </div>

        {/* Rating slider */}
        <div className="rounded-2xl border border-primary/10 bg-steam p-4">
          <RatingSlider value={rating} onChange={setRating} />
          <p className="text-center text-sm text-primary/80 mt-3 min-h-[20px]">
            {RATING_LABELS[rating]}
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        {/* CTA */}
        <button
          type="button"
          disabled={isLoading}
          onClick={handleGetCoaching}
          className="w-full bg-primary text-background-dark font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all disabled:opacity-70 hover:enabled:scale-[1.01]"
        >
          {isLoading ? (
            <span>Coach Kapi is thinking{".".repeat(dotCount)}</span>
          ) : (
            "Get my coaching →"
          )}
        </button>
      </div>
    </main>
  );
}
