"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useBrewHistoryStore, type FreestyleBrewEntry } from "@/lib/brewHistoryStore";
import { useBeansStore } from "@/lib/beansStore";
import { COACH_TIPS } from "@/lib/coachTips";

function methodLabel(methodId: string | null | undefined) {
  if (!methodId) return "Unknown Method";
  const labels: Record<string, string> = {
    v60: "V60", chemex: "Chemex", kalita_wave: "Kalita Wave",
    clever_dripper: "Clever Dripper", hario_switch: "Hario Switch",
    aeropress: "AeroPress", french_press: "French Press",
    moka_pot: "Moka Pot", cold_brew: "Cold Brew",
    south_indian_filter: "Filter Kaapi", pour_over: "Pour Over",
  };
  return labels[methodId] ?? methodId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

function ratio(coffeeGrams: number, waterMl: number) {
  if (!coffeeGrams) return "";
  return `1:${Math.round(waterMl / coffeeGrams)}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Map method IDs to the keyword prefix used in COACH_TIPS */
const METHOD_TIP_PREFIX: Record<string, string> = {
  pour_over: "pour over", v60: "pour over", chemex: "pour over",
  kalita_wave: "pour over", clever_dripper: "pour over", hario_switch: "pour over",
  aeropress: "aeropress", french_press: "french press",
  moka_pot: "moka pot", cold_brew: "cold brew",
  south_indian_filter: "filter kaapi",
};

function getFilteredTips(equipment: string[]): string[] {
  if (equipment.length === 0) return COACH_TIPS;
  const prefixes = equipment.map((eq) => METHOD_TIP_PREFIX[eq] ?? eq.replace(/_/g, " ")).filter(Boolean);
  const filtered = COACH_TIPS.filter((tip) => {
    const lower = tip.toLowerCase();
    return prefixes.some((p) => lower.includes(p));
  });
  const allPrefixes = Object.values(METHOD_TIP_PREFIX);
  const generic = COACH_TIPS.filter((tip) => {
    const lower = tip.toLowerCase();
    return !allPrefixes.some((p) => lower.includes(p));
  });
  const combined = [...filtered, ...generic];
  return combined.length > 0 ? combined : COACH_TIPS;
}

function generateInsight(
  entries: FreestyleBrewEntry[],
  equipment: string[],
): { icon: string; title: string; body: string; avatar: string } {
  if (entries.length === 0) {
    const tips = getFilteredTips(equipment);
    const tip = tips[Math.floor(Math.random() * tips.length)];
    return {
      icon: "waving_hand",
      avatar: "/coach/img3_waving.png",
      title: "Welcome, brewer!",
      body: tip + "\n\nLog your first brew to get personalized coaching.",
    };
  }

  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const recent = sorted.slice(0, 5);
  const rated = recent.filter((e) => typeof e.rating === "number");

  const unrated = sorted.filter((e) => e.rating === null || e.rating === undefined);
  if (unrated.length > 0) {
    return {
      icon: "rate_review",
      avatar: "/coach/img3_holding_whistle.png",
      title: "Rate your recent brews",
      body: `You have ${unrated.length} unrated brew${unrated.length > 1 ? "s" : ""}. Rate them to unlock coaching insights.`,
    };
  }

  if (rated.length === 0) {
    return {
      icon: "rate_review",
      avatar: "/coach/img3_holding_whistle.png",
      title: "Rate your brews",
      body: "Rate your recent brews to get personalized coaching insights.",
    };
  }

  const avgRating = rated.reduce((sum, e) => sum + (e.rating ?? 0), 0) / rated.length;

  if (avgRating <= 4) {
    const hasSour = recent.some((e) => e.coachingFeedback?.toLowerCase().includes("sour"));
    const hasBitter = recent.some((e) => e.coachingFeedback?.toLowerCase().includes("bitter"));
    if (hasSour) {
      return {
        icon: "trending_up",
        avatar: "/coach/img2_laptop_focused.png",
        title: "Your brews are running sour",
        body: "Try grinding a touch finer and extending your brew time by 15-20 seconds.",
      };
    }
    if (hasBitter) {
      return {
        icon: "trending_up",
        avatar: "/coach/img2_laptop_focused.png",
        title: "Your brews are running bitter",
        body: "Go slightly coarser on your grind and shorten brew time.",
      };
    }
    return {
      icon: "psychology",
      avatar: "/coach/img3_whistle_blowing.png",
      title: "Let's fix your brews",
      body: "Your recent ratings are low. Tap a brew below and tell me what's wrong — I'll help you dial it in.",
    };
  }

  if (rated.length >= 3) {
    const firstHalf = rated.slice(Math.floor(rated.length / 2));
    const secondHalf = rated.slice(0, Math.floor(rated.length / 2));
    const avgFirst = firstHalf.reduce((s, e) => s + (e.rating ?? 0), 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, e) => s + (e.rating ?? 0), 0) / secondHalf.length;
    if (avgSecond - avgFirst >= 1.5) {
      return {
        icon: "trending_up",
        avatar: "/coach/img3_hero_thumbs_up.png",
        title: "You're on a roll!",
        body: `Your ratings are trending up — averaging ${avgRating.toFixed(1)}/10. Keep doing what you're doing.`,
      };
    }
  }

  if (avgRating >= 8) {
    return {
      icon: "emoji_events",
      avatar: "/coach/img3_thumbs_whistle.png",
      title: "You're brewing like a pro",
      body: `Averaging ${avgRating.toFixed(1)}/10 recently. Save your best brews as favourites to lock in your recipe.`,
    };
  }

  return {
    icon: "auto_fix_high",
    avatar: "/coach/img3_whistle_blowing.png",
    title: "One tweak away",
    body: `You're averaging ${avgRating.toFixed(1)}/10. Pick a brew below and set a goal — I'll tell you what to change.`,
  };
}

function CoachedBrewCard({ entry, beanName, onClick }: { entry: FreestyleBrewEntry; beanName: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-primary/15 bg-primary/5 p-4 text-left hover:border-primary/30 transition-colors"
    >
      <div className="flex gap-4 items-start">
        <Image
          src="/coach/img3_whistle_blowing.png"
          alt="Coach"
          width={56}
          height={56}
          className="w-14 h-14 object-contain shrink-0 drop-shadow-md"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 leading-relaxed">{entry.coachingFeedback}</p>
          <p className="text-[10px] text-slate-500 mt-2">
            {beanName} · {ratio(entry.coffeeGrams, entry.waterMl)} · {formatDate(entry.createdAt)}
            {typeof entry.rating === "number" && ` · ${entry.rating}/10`}
          </p>
        </div>
        <span className="material-symbols-outlined text-primary/30 text-base shrink-0 mt-4">chevron_right</span>
      </div>
    </button>
  );
}

function UncoachedBrewCard({ entry, beanName, onClick }: { entry: FreestyleBrewEntry; beanName: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left hover:border-amber-500/50 transition-colors"
    >
      <div className="flex gap-4 items-start">
        <div className="relative shrink-0">
          <Image
            src="/coach/img3_holding_whistle.png"
            alt="Coach"
            width={56}
            height={56}
            className="w-14 h-14 object-contain drop-shadow-md"
          />
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-amber-500/30" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-200">Rate this brew and get coached!</p>
          <p className="text-[10px] text-slate-500 mt-1.5">
            {beanName} · {ratio(entry.coffeeGrams, entry.waterMl)} · {formatDate(entry.createdAt)}
          </p>
          <span className="inline-block mt-2 text-[10px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">
            Get Coached
          </span>
        </div>
      </div>
    </button>
  );
}

export default function CoachPage() {
  const router = useRouter();
  const entries = useBrewHistoryStore((state) => state.entries);
  const loading = useBrewHistoryStore((state) => state.loading);
  const fetchEntries = useBrewHistoryStore((state) => state.fetchEntries);
  const beans = useBeansStore((state) => state.userBeans);
  const fetchBeans = useBeansStore((state) => state.fetchBeans);

  const [equipment, setEquipment] = useState<string[]>([]);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  useEffect(() => {
    Promise.all([fetchEntries(), fetchBeans()]).finally(() => setInitialFetchDone(true));
  }, [fetchEntries, fetchBeans]);

  useEffect(() => {
    fetch("/api/users/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((user) => {
        if (Array.isArray(user.primary_equipment)) {
          setEquipment(user.primary_equipment as string[]);
        }
      })
      .catch(() => {});
  }, []);

  // Group brews by method, last 2 per method
  const brewsByMethod = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const groups: Record<string, FreestyleBrewEntry[]> = {};
    for (const entry of sorted) {
      const key = entry.methodId ?? "unknown";
      if (!groups[key]) groups[key] = [];
      if (groups[key].length < 2) groups[key].push(entry);
    }
    return groups;
  }, [entries]);

  const methodKeys = Object.keys(brewsByMethod);

  const insight = useMemo(
    () => generateInsight(entries, equipment),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries.length, equipment.length],
  );

  const filteredTips = useMemo(() => {
    const tips = getFilteredTips(equipment);
    const shuffled = [...tips].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipment.length]);

  function getBeanName(beanId: string | null) {
    if (!beanId) return "Unknown Bean";
    return beans.find((b) => b.id === beanId)?.beanName ?? "Unknown Bean";
  }

  if (!initialFetchDone && loading) {
    return (
      <main className="pb-28">
        <div className="px-4 pt-6 space-y-4">
          <div className="h-32 rounded-2xl bg-primary/5 border border-primary/10 animate-pulse" />
          <div className="h-24 rounded-2xl bg-primary/5 border border-primary/10 animate-pulse" />
          <div className="h-24 rounded-2xl bg-primary/5 border border-primary/10 animate-pulse" />
        </div>
      </main>
    );
  }

  return (
    <main className="overflow-y-auto pb-28">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Your Coach</p>
        <h1 className="text-2xl font-bold text-slate-100">Coffee Coach</h1>
      </div>

      {/* The One Thing — proactive insight */}
      <div className="px-4 py-3">
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-5">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 shrink-0">
              <Image
                src={insight.avatar}
                alt="Coffee Coach"
                width={64}
                height={64}
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-100">{insight.title}</h2>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed whitespace-pre-line">{insight.body}</p>
            </div>
          </div>
          {entries.length === 0 && (
            <Link
              href="/log-brew"
              className="mt-4 w-full bg-primary text-background-dark font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Log Your First Brew
            </Link>
          )}
        </div>
      </div>

      {/* Brews grouped by method — coaching-centric cards */}
      {methodKeys.length > 0 && (
        <section className="px-4 py-3 space-y-5">
          {methodKeys.map((methodId) => {
            const methodBrews = brewsByMethod[methodId];
            return (
              <div key={methodId}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                    <Image src={methodImage(methodId)} alt={methodLabel(methodId)} width={18} height={18} className="w-[18px] h-[18px] object-contain" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{methodLabel(methodId)}</h3>
                </div>
                <div className="space-y-2">
                  {methodBrews.map((entry) => {
                    const beanName = getBeanName(entry.beanId);
                    const hasCoaching = !!entry.coachingFeedback;

                    return hasCoaching ? (
                      <CoachedBrewCard
                        key={entry.id}
                        entry={entry}
                        beanName={beanName}
                        onClick={() => router.push(`/coach/brew/${entry.id}`)}
                      />
                    ) : (
                      <UncoachedBrewCard
                        key={entry.id}
                        entry={entry}
                        beanName={beanName}
                        onClick={() => router.push(`/coach/brew/${entry.id}`)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Coach's Tips — filtered by equipment */}
      <section className="px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Image src="/coach/img2_reading_book.png" alt="Coach" width={28} height={28} className="object-contain" />
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Coach&apos;s Tips</h3>
        </div>
        <div className="space-y-2">
          {filteredTips.map((tip, i) => (
            <div
              key={i}
              className="rounded-xl border border-primary/10 bg-primary/5 p-4 flex gap-3"
            >
              <span className="material-symbols-outlined text-primary text-lg shrink-0 mt-0.5">lightbulb</span>
              <p className="text-sm text-slate-300 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
