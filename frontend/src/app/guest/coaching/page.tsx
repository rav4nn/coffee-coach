"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { CompactFlowHeader } from "@/components/CompactFlowHeader";
import { useGuestBrewStore, type GuestCoachingChange } from "@/lib/guestBrewStore";

// ── Symptom → root cause label ──────────────────────────────────────────────
const SYMPTOM_DIAGNOSIS: Record<string, string> = {
  "sour":        "Under-extracted",
  "bitter":      "Over-extracted",
  "weak/watery": "Under-extracted",
  "flat":        "Under-developed",
  "muddy/silty": "Over-extracted",
  "woody/papery":"Stale beans",
};

function buildDiagnosis(symptoms: string[]): string {
  if (symptoms.length === 0) return "Needs adjustment";
  const roots = symptoms.map((s) => SYMPTOM_DIAGNOSIS[s] ?? "Off balance");
  const uniqueRoots = [...new Set(roots)];
  const rootLabel = uniqueRoots.length === 1 ? uniqueRoots[0] : "Mixed extraction";
  const symptomLabel = symptoms.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" · ");
  return `${rootLabel} · ${symptomLabel}`;
}

// ── High-rating positive messages ───────────────────────────────────────────
const HIGH_RATING_MESSAGES: string[] = [
  "You're already brewing well — these small tweaks should take it to the next level.",
  "Not bad at all! Just a couple of minor adjustments to dial it in.",
  "You're close to a great cup. A small nudge in the right direction is all you need.",
  "Good foundation here. Fine-tune these and you'll have it dialled in.",
];

function getPositiveMessage(rating: number): string | null {
  if (rating < 7) return null;
  return HIGH_RATING_MESSAGES[rating % HIGH_RATING_MESSAGES.length];
}

// ── Parameter display config ─────────────────────────────────────────────────
const ALL_PARAMS = [
  { key: "grindSize",   label: "Grind Size" },
  { key: "brewTime",    label: "Brew Time" },
  { key: "coffeeGrams", label: "Dose" },
  { key: "waterTempC",  label: "Water Temp" },
] as const;

type ParamKey = typeof ALL_PARAMS[number]["key"];

function formatParamValue(key: ParamKey, value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  if (key === "coffeeGrams") return `${value}g`;
  if (key === "waterTempC") return `${value}°C`;
  return String(value);
}

function getStoreValue(key: ParamKey, store: ReturnType<typeof useGuestBrewStore.getState>): string | number | null {
  if (key === "grindSize") return store.grindClicks ?? store.grindSize;
  if (key === "brewTime") return store.brewTime;
  if (key === "coffeeGrams") return store.coffeeGrams;
  if (key === "waterTempC") return store.waterTempC;
  return null;
}

// ── Single parameter card ────────────────────────────────────────────────────
function ParamCard({
  label,
  paramKey,
  change,
  beforeValue,
}: {
  label: string;
  paramKey: ParamKey;
  change: GuestCoachingChange | undefined;
  beforeValue: string | number | null;
}) {
  const hasChange = change != null && change.newValue != null && change.previousValue != null;
  const displayBefore = hasChange
    ? formatParamValue(paramKey, change.previousValue)
    : formatParamValue(paramKey, beforeValue);
  const displayAfter = hasChange
    ? formatParamValue(paramKey, change.newValue)
    : formatParamValue(paramKey, beforeValue);

  return (
    <div
      className={`rounded-xl p-3 ${
        hasChange
          ? "border border-primary/30 bg-[#2a1500]"
          : "border border-white/5 bg-[#1a1208] opacity-50"
      }`}
    >
      <p className={`text-[10px] uppercase tracking-widest font-normal mb-2 ${hasChange ? "text-primary/70" : "text-slate-500"}`}>
        {label}
      </p>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-center text-sm font-normal text-slate-300 bg-black/30 rounded-lg py-1.5 px-2">
          {displayBefore}
        </span>
        <span className={`text-sm ${hasChange ? "text-primary" : "text-slate-600"}`}>→</span>
        <span
          className={`flex-1 text-center text-sm font-bold rounded-lg py-1.5 px-2 ${
            hasChange
              ? "bg-primary/20 text-primary border border-primary/40"
              : "bg-black/20 text-slate-500"
          }`}
        >
          {displayAfter}
        </span>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function GuestCoachingResult() {
  const router = useRouter();
  const result = useGuestBrewStore((s) => s.coachingResult);
  const store = useGuestBrewStore();
  const [showReadMore, setShowReadMore] = useState(false);

  useEffect(() => {
    if (!result) router.replace("/guest/brew");
  }, [result, router]);

  if (!result) return null;

  const diagnosis = buildDiagnosis(store.symptoms);
  const positiveMessage = getPositiveMessage(store.rating);
  const changesByParam = new Map<string, GuestCoachingChange>(
    result.changes.filter((c) => c.previousValue != null && c.newValue != null).map((c) => [c.param, c])
  );
  const adjustmentCount = changesByParam.size;

  function handleSignIn() {
    const guestData = {
      methodId: store.methodId,
      symptoms: store.symptoms,
      goals: store.goals,
      rating: store.rating,
      coffeeGrams: store.coffeeGrams,
      waterMl: store.waterMl,
      waterTempC: store.waterTempC,
      grindSize: store.grindSize,
      grindClicks: store.grindClicks,
      brewTime: store.brewTime,
      grinderName: store.grinderName,
      coachingResult: store.coachingResult,
    };
    const encoded = btoa(JSON.stringify(guestData));
    void signIn("google", { callbackUrl: `/post-login?guestBrew=${encoded}` });
  }

  return (
    <main className="overflow-y-auto pb-28">
      <CompactFlowHeader title="Coach's Advice" onBack={() => router.back()} />

      <div className="px-4 pt-4 space-y-4">

        {/* Diagnosis card */}
        <div className="rounded-2xl border border-white/8 bg-[#1e1208] p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Image
                src="/coach/coffee_coach_magnifying.png"
                alt=""
                width={28}
                height={28}
                className="w-7 h-7 object-contain"
                style={{ mixBlendMode: "screen" }}
              />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-normal">Diagnosis</p>
              <p className="text-base font-bold text-slate-100">{diagnosis}</p>
            </div>
          </div>

          {/* Parameter cards grid */}
          <div className="grid grid-cols-2 gap-2">
            {ALL_PARAMS.map(({ key, label }) => (
              <ParamCard
                key={key}
                label={label}
                paramKey={key}
                change={changesByParam.get(key)}
                beforeValue={getStoreValue(key, store)}
              />
            ))}
          </div>

          {/* Brew context footer */}
          <div className="mt-3 pt-3 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {store.methodId && (
                <span className="text-xs text-slate-400 capitalize">{store.methodId.replace(/_/g, " ")}</span>
              )}
              {store.coffeeGrams && (
                <span className="text-xs text-slate-500">{store.coffeeGrams}g coffee</span>
              )}
              {store.waterMl && (
                <span className="text-xs text-slate-500">{store.waterMl}ml water</span>
              )}
              {store.waterTempC && (
                <span className="text-xs text-slate-500">{store.waterTempC}°C</span>
              )}
              {store.brewTime && (
                <span className="text-xs text-slate-500">{store.brewTime}</span>
              )}
              {(store.grindClicks ?? store.grindSize) && (
                <span className="text-xs text-slate-500">
                  {store.grindClicks ? `${store.grindClicks} clicks` : store.grindSize}
                </span>
              )}
            </div>
            {positiveMessage && (
              <p className="text-xs text-primary/60 italic">{positiveMessage}</p>
            )}
          </div>
        </div>

        {/* Freshness caveat */}
        {result.freshness_caveat && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-xs text-amber-200/80">{result.freshness_caveat}</p>
          </div>
        )}

        {/* Read more — prose from coaching engine */}
        <div className="rounded-xl border border-white/8 bg-[#1a1208] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowReadMore((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-xs text-slate-400 font-normal">Why? Read the full diagnosis</span>
            <span className="text-slate-500 text-sm">{showReadMore ? "▲" : "▼"}</span>
          </button>
          {showReadMore && (
            <div className="px-4 pb-4">
              <p className="text-sm leading-relaxed text-slate-300">{result.fix}</p>
            </div>
          )}
        </div>

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

      </div>
    </main>
  );
}
