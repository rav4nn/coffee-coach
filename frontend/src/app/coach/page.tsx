"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useBrewHistoryStore } from "@/lib/brewHistoryStore";
import { useBeansStore } from "@/lib/beansStore";
import { COACH_TIPS } from "@/lib/coachTips";

function methodLabel(methodId: string | null | undefined) {
  if (!methodId) return "Unknown Method";
  return methodId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function methodIcon(methodId: string | null | undefined) {
  if (!methodId) return "coffee";
  if (methodId.includes("pour_over")) return "water_drop";
  if (methodId.includes("aeropress")) return "compress";
  if (methodId.includes("french_press")) return "coffee_maker";
  if (methodId.includes("moka_pot")) return "soup_kitchen";
  if (methodId.includes("cold_brew")) return "ac_unit";
  if (methodId.includes("south_indian_filter")) return "filter_alt";
  return "coffee";
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
  pour_over: "pour over",
  v60: "pour over",
  chemex: "pour over",
  kalita_wave: "pour over",
  clever_dripper: "pour over",
  hario_switch: "pour over",
  aeropress: "aeropress",
  french_press: "french press",
  moka_pot: "moka pot",
  cold_brew: "cold brew",
  south_indian_filter: "filter kaapi",
};

function getFilteredTips(equipment: string[]): string[] {
  if (equipment.length === 0) return COACH_TIPS;
  const prefixes = equipment.map((eq) => METHOD_TIP_PREFIX[eq] ?? eq.replace(/_/g, " ")).filter(Boolean);
  const filtered = COACH_TIPS.filter((tip) => {
    const lower = tip.toLowerCase();
    return prefixes.some((p) => lower.includes(p));
  });
  // Also include generic tips (those that don't match any specific method prefix)
  const allPrefixes = Object.values(METHOD_TIP_PREFIX);
  const generic = COACH_TIPS.filter((tip) => {
    const lower = tip.toLowerCase();
    return !allPrefixes.some((p) => lower.includes(p));
  });
  const combined = [...filtered, ...generic];
  return combined.length > 0 ? combined : COACH_TIPS;
}

function generateInsight(
  entries: ReturnType<typeof useBrewHistoryStore.getState>["entries"],
  equipment: string[],
): { icon: string; title: string; body: string; avatar: string } {
  if (entries.length === 0) {
    // No brews — show a tip based on equipment
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

  // Check for unrated brews
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

  // Low ratings — diagnosis mode
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

  // Improving — ratings trending up
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

  // High ratings — lock-in mode
  if (avgRating >= 8) {
    return {
      icon: "emoji_events",
      avatar: "/coach/img3_thumbs_whistle.png",
      title: "You're brewing like a pro",
      body: `Averaging ${avgRating.toFixed(1)}/10 recently. Save your best brews as favourites to lock in your recipe.`,
    };
  }

  // Mid range — refinement
  return {
    icon: "auto_fix_high",
    avatar: "/coach/img3_whistle_blowing.png",
    title: "One tweak away",
    body: `You're averaging ${avgRating.toFixed(1)}/10. Pick a brew below and set a goal — I'll tell you what to change.`,
  };
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

  // Load user equipment from profile
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

  const recentFirst = useMemo(
    () => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries],
  );

  const recentFive = recentFirst.slice(0, 5);

  const insight = useMemo(
    () => generateInsight(entries, equipment),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries.length, equipment.length],
  );

  const filteredTips = useMemo(() => {
    const tips = getFilteredTips(equipment);
    // Shuffle and pick 2
    const shuffled = [...tips].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipment.length]);

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

      {/* Recent Brews — interactive cards */}
      {recentFive.length > 0 && (
        <section className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Recent Brews</h3>
            <Link href="/history" className="text-xs text-primary font-semibold flex items-center gap-0.5">
              View all
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </Link>
          </div>
          <div className="space-y-2">
            {recentFive.map((entry) => {
              const bean = beans.find((b) => b.id === entry.beanId);
              const beanName = bean ? bean.beanName : "Unknown Bean";
              const icon = methodIcon(entry.methodId);
              const hasRating = typeof entry.rating === "number";
              const hasCoaching = !!entry.coachingFeedback;

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => router.push(`/coach/brew/${entry.id}`)}
                  className="w-full rounded-xl border border-primary/15 bg-primary/5 p-3 text-left hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <p className="text-sm font-semibold text-slate-100 truncate">{beanName}</p>
                        <p className="text-[10px] text-slate-500 shrink-0">{formatDate(entry.createdAt)}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {methodLabel(entry.methodId)} · {entry.coffeeGrams}g · {ratio(entry.coffeeGrams, entry.waterMl)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {hasRating && (
                          <span className="flex items-center gap-0.5 text-xs text-primary font-semibold">
                            <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>star</span>
                            {entry.rating}/10
                          </span>
                        )}
                        {hasCoaching && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary/80 font-semibold">Coached</span>
                        )}
                        {!hasRating && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 font-semibold">Unrated</span>
                        )}
                        {entry.isFavourite && (
                          <span className="material-symbols-outlined text-primary" style={{ fontSize: "12px" }}>favorite</span>
                        )}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-primary/40 text-lg shrink-0">chevron_right</span>
                  </div>
                </button>
              );
            })}
          </div>
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
