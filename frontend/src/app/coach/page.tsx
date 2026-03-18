"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FilterDropdown, ALL_METHODS, type FilterState, methodLabelFromId } from "@/components/FilterDropdown";
import { useBrewHistoryStore, type FreestyleBrewEntry } from "@/lib/brewHistoryStore";
import { useBeansStore } from "@/lib/beansStore";
import { COACH_TIPS } from "@/lib/coachTips";

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d
    .toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();
}

function getDateGroup(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "TODAY";
  if (date.toDateString() === yesterday.toDateString()) return "YESTERDAY";
  return date
    .toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    .toUpperCase();
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

function CoachBrewCard({
  entry,
  beanName,
  onClick,
}: {
  entry: FreestyleBrewEntry;
  beanName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-primary/15 bg-primary/5 text-left hover:bg-primary/[0.08] transition-colors overflow-hidden"
    >
      <div className="flex items-center border-l-4 border-primary pl-3 pr-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-100 truncate">
            {methodLabelFromId(entry.methodId)} - {beanName}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDateTime(entry.createdAt)}
          </p>
        </div>
        {typeof entry.rating === "number" ? (
          <span className="shrink-0 text-xl font-extrabold text-primary ml-3">
            {entry.rating}<span className="text-sm font-bold text-primary/60">/10</span>
          </span>
        ) : (
          <span className="shrink-0 text-sm font-semibold text-slate-600 ml-3">—</span>
        )}
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
  const [activeTab, setActiveTab] = useState<"training" | "best">("training");
  const [filters, setFilters] = useState<FilterState>({ methods: [], beanIds: [] });

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

  // Filter + sort brews for active tab
  const filteredBrews = useMemo(() => {
    let base = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // Tab filter
    if (activeTab === "best") {
      base = base.filter((e) => e.rating === 10);
    }

    // Method filter
    if (filters.methods.length > 0) {
      base = base.filter((e) => e.methodId && filters.methods.includes(e.methodId));
    }

    // Bean filter
    if (filters.beanIds.length > 0) {
      base = base.filter((e) => e.beanId && filters.beanIds.includes(e.beanId));
    }

    return base;
  }, [entries, activeTab, filters]);

  // Group by date
  const dateGroups = useMemo(() => {
    const map = new Map<string, FreestyleBrewEntry[]>();
    for (const entry of filteredBrews) {
      const key = getDateGroup(entry.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return Array.from(map.entries());
  }, [filteredBrews]);

  // Available filter options
  const availableMethods = useMemo(() => {
    const seen = new Set<string>();
    for (const e of entries) if (e.methodId) seen.add(e.methodId);
    return ALL_METHODS.map((m) => m.id).filter((id) => seen.has(id));
  }, [entries]);

  const availableBeans = useMemo(() => {
    const seen = new Set<string>();
    for (const e of entries) if (e.beanId) seen.add(e.beanId);
    return beans
      .filter((b) => seen.has(b.id))
      .map((b) => ({ id: b.id, label: `${b.roaster} — ${b.beanName}` }));
  }, [entries, beans]);

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
    const bean = beans.find((b) => b.id === beanId);
    if (!bean) return "Unknown Bean";
    return `${bean.roaster} — ${bean.beanName}`;
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
      {/* Toggle */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center rounded-full border border-primary/20 bg-primary/5 p-1">
          <button
            onClick={() => setActiveTab("training")}
            className={`flex-1 text-center py-2 rounded-full text-sm font-semibold transition-colors ${
              activeTab === "training"
                ? "bg-primary text-background-dark"
                : "text-primary/70"
            }`}
          >
            Training Log
          </button>
          <button
            onClick={() => setActiveTab("best")}
            className={`flex-1 text-center py-2 rounded-full text-sm font-semibold transition-colors ${
              activeTab === "best"
                ? "bg-primary text-background-dark"
                : "text-primary/70"
            }`}
          >
            Top Performances
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 pb-2 flex justify-end">
        <FilterDropdown
          filters={filters}
          onChange={setFilters}
          availableMethods={availableMethods}
          availableBeans={availableBeans}
        />
      </div>

      {/* Insight card — training tab only */}
      {activeTab === "training" && (
        <div className="px-4 py-2">
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
      )}

      {/* Brew cards grouped by date */}
      {filteredBrews.length === 0 ? (
        <div className="py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-600">
            {activeTab === "best" ? "emoji_events" : "menu_book"}
          </span>
          <p className="mt-2 text-sm text-slate-400">
            {activeTab === "best" ? "No perfect brews yet." : "No brews found."}
          </p>
          {activeTab === "best" && (
            <p className="text-xs text-slate-500 mt-1">Rate a brew 10/10 to see it here.</p>
          )}
        </div>
      ) : (
        <div className="px-4 pt-1 space-y-4">
          {dateGroups.map(([dateLabel, groupEntries]) => (
            <div key={dateLabel}>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">{dateLabel}</p>
              <div className="space-y-2">
                {groupEntries.map((entry) => (
                  <CoachBrewCard
                    key={entry.id}
                    entry={entry}
                    beanName={getBeanName(entry.beanId)}
                    onClick={() => router.push(`/coach/brew/${entry.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Did you know? — tip filtered by recent method + equipment (training tab only) */}
      {activeTab === "training" && filteredTip && (
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
    </main>
  );
}
