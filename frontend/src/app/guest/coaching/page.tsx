"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { CompactFlowHeader } from "@/components/CompactFlowHeader";
import { useGuestBrewStore } from "@/lib/guestBrewStore";

const PARAM_LABELS: Record<string, string> = {
  grindSize: "Grind",
  coffeeGrams: "Dose",
  waterTempC: "Temp",
  brewTime: "Brew Time",
};

function formatValue(param: string, value: string | number | null | undefined): string {
  if (value == null) return "—";
  if (param === "coffeeGrams") return `${value}g`;
  if (param === "waterTempC") return `${value}°C`;
  return String(value);
}

export default function GuestCoachingResult() {
  const router = useRouter();
  const result = useGuestBrewStore((s) => s.coachingResult);
  const store = useGuestBrewStore();

  // If no result, redirect back
  useEffect(() => {
    if (!result) {
      router.replace("/guest/brew");
    }
  }, [result, router]);

  if (!result) return null;

  const displayableChanges = result.changes.filter(
    (c) => c.previousValue != null && c.newValue != null
  );

  function handleSignIn() {
    // Encode guest brew data into callbackUrl for post-login persistence
    const guestData = {
      methodId: store.methodId,
      beanName: store.beanName,
      symptoms: store.symptoms,
      goals: store.goals,
      rating: store.rating,
      coffeeGrams: store.coffeeGrams,
      waterMl: store.waterMl,
      waterTempC: store.waterTempC,
      grindSize: store.grindSize,
      brewTime: store.brewTime,
      coachingResult: store.coachingResult,
    };
    const encoded = btoa(JSON.stringify(guestData));
    void signIn("google", { callbackUrl: `/post-login?guestBrew=${encoded}` });
  }

  return (
    <main className="overflow-y-auto pb-28">
      <CompactFlowHeader
        title="Coach&apos;s Advice"
        onBack={() => router.back()}
      />

      <div className="px-4 pt-4 space-y-4">
        {/* Coach bubble */}
        <div className="flex gap-3 items-start">
          <div className="w-10 h-10 shrink-0 mt-1">
            <Image
              src="/coach/coffee_coach_pointing.png"
              alt="Coach Kapi"
              width={40}
              height={40}
              className="w-full h-full object-contain"
              style={{ mixBlendMode: "screen" }}
            />
          </div>
          <div className="flex-1 rounded-2xl border border-primary/10 bg-steam p-4">
            <p className="text-[10px] uppercase tracking-widest text-primary/70 font-normal mb-2">
              Coach Kapi
            </p>
            <p className="text-sm leading-relaxed text-slate-200">
              {result.fix}
            </p>

            {/* Suggested adjustments */}
            {displayableChanges.length > 0 && (
              <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-normal">
                  Suggested adjustments
                </p>
                {displayableChanges.map((change, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-xs font-normal text-slate-400">
                      {PARAM_LABELS[change.param] ?? change.param}
                    </span>
                    <span className="text-xs font-normal text-primary">
                      {formatValue(change.param, change.previousValue)} → {formatValue(change.param, change.newValue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Freshness caveat */}
        {result.freshness_caveat && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-xs text-amber-200/80">{result.freshness_caveat}</p>
          </div>
        )}

        {/* Sign-up nudge */}
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <p className="text-sm text-slate-300 mb-3">
            Want to save this brew and track your improvement over time?
          </p>
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full bg-primary text-background-dark font-bold py-3 rounded-xl transition-all hover:scale-[1.01]"
          >
            Sign in to save your brew
          </button>
        </div>

        {/* Try again */}
        <button
          type="button"
          onClick={() => {
            store.reset();
            router.push("/guest/brew");
          }}
          className="w-full bg-primary/10 border border-primary/20 text-slate-100 font-semibold py-3 rounded-xl transition-all hover:scale-[1.01]"
        >
          Fix another brew
        </button>
      </div>
    </main>
  );
}
