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

function getFilteredTips(equipment: string[], recentMethodId?: string | null): string[] {
  const sources = [...equipment];
  if (recentMethodId && !sources.includes(recentMethodId)) sources.push(recentMethodId);

  if (sources.length === 0) return COACH_TIPS;
  const prefixes = sources.map((eq) => METHOD_TIP_PREFIX[eq] ?? eq.replace(/_/g, " ")).filter(Boolean);
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

function CoachedBrewCard({
  entry,
  beanName,
  onClick,
}: {
  entry: FreestyleBrewEntry;
  beanName: string;
  onClick: () => void;
}) {
  const changes = entry.coachingChanges ?? [];
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-primary/15 bg-primary/5 p-4 text-left hover:bg-primary/[0.08] transition-colors"
    >
      {/* Top row: bean · ratio · date | rating */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs text-slate-400 truncate">
          {beanName} · {ratio(entry.coffeeGrams, entry.waterMl)} · {formatDate(entry.createdAt)}
        </p>
        {typeof entry.rating === "number" && (
          <span className="shrink-0 flex items-center gap-0.5 text-xs font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full">
            <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>star</span>
            {entry.rating}/10
          </span>
        )}
      </div>

      {/* Coaching feedback */}
      <p className="text-sm text-slate-200 leading-relaxed">{entry.coachingFeedback}</p>

      {/* Parameter change badges */}
      {changes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {changes.map((change, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary/80 font-semibold border border-primary/20"
            >
              {change.suggestion}
            </span>
          ))}
        </div>
      )}
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
      {/* Top row: bean · ratio · date */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs text-slate-400 truncate">
          {beanName} · {ratio(entry.coffeeGrams, entry.waterMl)} · {formatDate(entry.createdAt)}
        </p>
      </div>

      <div className="flex gap-4 items-start">
        <div className="relative shrink-0">
          <Image
            src="/coach/img3_holding_whistle.png"
            alt="Coach"
            width={64}
            height={64}
            className="w-16 h-16 object-contain drop-shadow-md"
          />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-amber-500/30" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-200">Rate this brew and get coached!</p>
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
  const [showBest, setShowBest] = useState(false);

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

  // Most recent method for tip filtering
  const recentMethodId = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted[0]?.methodId ?? null;
  }, [entries]);

  // Group brews by method, last 2 per method (exclude 10/10 brews)
  const brewsByMethod = useMemo(() => {
    const sorted = [...entries]
      .filter((e) => e.rating !== 10)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const groups: Record<string, FreestyleBrewEntry[]> = {};
    for (const entry of sorted) {
      const key = entry.methodId ?? "unknown";
      if (!groups[key]) groups[key] = [];
      if (groups[key].length < 2) groups[key].push(entry);
    }
    return groups;
  }, [entries]);

  // Best brews: rating === 10 only, grouped by method
  const bestBrewsByMethod = useMemo(() => {
    const best = [...entries]
      .filter((e) => e.rating === 10)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const groups: Record<string, FreestyleBrewEntry[]> = {};
    for (const entry of best) {
      const key = entry.methodId ?? "unknown";
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    }
    return groups;
  }, [entries]);

  const methodKeys = Object.keys(showBest ? bestBrewsByMethod : brewsByMethod);
  const activeBrewGroups = showBest ? bestBrewsByMethod : brewsByMethod;

  const insight = useMemo(
    () => generateInsight(entries, equipment),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries.length, equipment.length],
  );

  const filteredTip = useMemo(() => {
    const tips = getFilteredTips(equipment, recentMethodId);
    const shuffled = [...tips].sort(() => Math.random() - 0.5);
    return shuffled[0] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipment.length, recentMethodId]);

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
      <div className="px-4 pt-4 pb-2 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Your Coach</p>
          <h1 className="text-2xl font-bold text-slate-100">Coffee Coach</h1>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => setShowBest((v) => !v)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              showBest
                ? "bg-primary text-background-dark border-primary"
                : "bg-primary/10 border-primary/20 text-primary/80"
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>emoji_events</span>
            Best Brews
          </button>
        )}
      </div>

      {/* Best Brews mode */}
      {showBest ? (
        <section className="px-4 py-3 space-y-5">
          {methodKeys.length === 0 ? (
            <div className="py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-600">emoji_events</span>
              <p className="mt-2 text-sm text-slate-400">No perfect brews yet.</p>
              <p className="text-xs text-slate-500 mt-1">Rate a brew 10/10 to see it here.</p>
            </div>
          ) : (
            methodKeys.map((methodId) => {
              const methodBrews = activeBrewGroups[methodId];
              return (
                <div key={methodId}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-espresso/20 border border-espresso/30 flex items-center justify-center shrink-0">
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
            })
          )}
        </section>
      ) : (
        <>
          {/* The One Thing — proactive insight */}
          <div className="px-4 py-3">
            <div className="rounded-2xl bg-primary/10 border border-primary/20 p-5">
              <div className="flex items-start gap-3">
                <div className="w-18 h-18 shrink-0">
                  <Image
                    src={insight.avatar}
                    alt="Coffee Coach"
                    width={72}
                    height={72}
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
                const methodBrews = activeBrewGroups[methodId];
                return (
                  <div key={methodId}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-espresso/20 border border-espresso/30 flex items-center justify-center shrink-0">
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

          {/* Did you know? — tip filtered by recent method + equipment */}
          {filteredTip && (
            <section className="px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <Image src="/coach/img2_reading_book.png" alt="Coach" width={32} height={32} className="object-contain" />
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Did you know?</h3>
              </div>
              <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 flex gap-3">
                <span className="material-symbols-outlined text-primary text-lg shrink-0 mt-0.5">lightbulb</span>
                <p className="text-sm text-slate-300 leading-relaxed">{filteredTip}</p>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
