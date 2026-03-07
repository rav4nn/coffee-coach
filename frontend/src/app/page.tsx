"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useBeansStore } from "@/lib/beansStore";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";

function toMethodLabel(methodId: string | null | undefined) {
  if (!methodId) {
    return "Unknown Method";
  }

  return methodId
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getTrendSummary(ratings: number[]) {
  if (ratings.length < 2) {
    return "Log a few brews to unlock trend insights.";
  }

  const recent = ratings.slice(0, 4);
  const baseline = ratings.slice(4, 8);
  if (baseline.length === 0) {
    const first = ratings[ratings.length - 1];
    const last = ratings[0];
    const delta = last - first;
    if (delta > 0.7) {
      return "Improving over your latest brews.";
    }
    if (delta < -0.7) {
      return "Ratings dipped recently. Use the last coaching tweak.";
    }
    return "Plateau detected in the latest brews.";
  }

  const recentAvg = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  const baselineAvg = baseline.reduce((sum, value) => sum + value, 0) / baseline.length;
  const change = recentAvg - baselineAvg;

  if (change > 0.4) {
    return `Improving over last ${recent.length} brews.`;
  }
  if (change < -0.4) {
    return `Downtrend over last ${recent.length} brews.`;
  }
  return "Plateau detected.";
}

export default function DashboardPage() {
  const entries = useBrewHistoryStore((state) => state.entries);
  const userBeans = useBeansStore((state) => state.userBeans);

  const sortedEntries = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const recentEntries = sortedEntries.slice(0, 6);
  const ratings = sortedEntries
    .map((entry) => (typeof entry.rating === "number" ? entry.rating : null))
    .filter((value): value is number => value !== null);

  const lastCoachingText =
    sortedEntries.find((entry) => entry.coachingFeedback)?.coachingFeedback ??
    "No coaching feedback yet. Log and rate a brew to get guidance.";

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mocha/70">Dashboard</p>
        <h1 className="font-serif text-4xl font-bold text-espresso">Brew, Improve, Repeat</h1>
      </div>

      <div className="rounded-2xl border border-mocha/10 bg-steam px-4 py-3 shadow-card">
        <p className="text-xs uppercase tracking-[0.18em] text-mocha/70">Trend Summary</p>
        <p className="mt-1 text-sm font-medium text-espresso">{getTrendSummary(ratings)}</p>
      </div>

      <div className="rounded-2xl border border-mocha/10 bg-steam px-4 py-3 shadow-card">
        <p className="text-xs uppercase tracking-[0.18em] text-mocha/70">Last Coaching Suggestion</p>
        <p className="mt-1 text-sm text-espresso">{lastCoachingText}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mocha/70">Recent Brews</p>
        {recentEntries.length === 0 ? (
          <div className="rounded-2xl border border-mocha/10 bg-steam px-3 py-2.5 shadow-card">
            <p className="text-xs text-mocha/80">No brews yet. Start with a quick log.</p>
          </div>
        ) : (
          recentEntries.map((entry) => {
            const beanName = userBeans.find((bean) => bean.id === entry.beanId)?.beanName ?? "Unknown Bean";

            return (
              <article
                key={entry.id}
                className="rounded-2xl border border-mocha/10 bg-steam px-3 py-2.5 shadow-card"
              >
                <p className="text-base font-semibold text-espresso">{toMethodLabel(entry.methodId)}</p>
                <p className="text-sm text-mocha/90">{beanName}</p>
                <p className="mt-0.5 text-xs text-mocha/70">
                  {formatDate(entry.createdAt)} · Rating:{" "}
                  {typeof entry.rating === "number" ? `${entry.rating}/10` : "--/10"}
                </p>
              </article>
            );
          })
        )}
      </div>

      <Button asChild className="h-12 w-full text-base">
        <Link href="/log-brew">Log Brew</Link>
      </Button>
    </section>
  );
}
