"use client";

import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useBeansStore } from "@/lib/beansStore";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";

function methodLabel(methodId: string | null | undefined) {
  if (!methodId) {
    return "Unknown Method";
  }
  return methodId
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function trendPattern(ratings: number[]) {
  if (ratings.length < 4) {
    return "Building trend data";
  }
  const diffs = ratings.slice(1).map((value, index) => value - ratings[index]);
  const positives = diffs.filter((diff) => diff > 0).length;
  const negatives = diffs.filter((diff) => diff < 0).length;
  const directionChanges = diffs.slice(1).filter((diff, index) => diff * diffs[index] < 0).length;

  if (directionChanges >= 2) {
    return "Oscillating";
  }
  if (positives > negatives + 1) {
    return "Improving";
  }
  if (negatives > positives + 1) {
    return "Worsening";
  }
  return "Plateau";
}

export default function HistoryPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const entries = useBrewHistoryStore((state) => state.entries);
  const beans = useBeansStore((state) => state.userBeans);

  const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const chartData = sorted.map((entry, index) => ({
    index: index + 1,
    rating: typeof entry.rating === "number" ? entry.rating : null,
  }));
  const ratings = chartData.map((item) => item.rating).filter((value): value is number => value !== null);
  const trend = trendPattern(ratings);
  const chartStroke = trend === "Improving" ? "#7fb069" : trend === "Worsening" ? "#ef4444" : "#f49d25";

  const recentFirst = useMemo(() => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [entries]);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mocha/70">History</p>
        <h1 className="font-serif text-4xl font-bold text-espresso">Brew History</h1>
      </div>

      <div className="rounded-3xl border border-mocha/10 bg-steam p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-espresso">Rating Trend</p>
          <p className="text-xs text-mocha/70">{trend}</p>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="index" tick={{ fontSize: 11, fill: "#cbbba9" }} />
              <YAxis domain={[1, 10]} tick={{ fontSize: 11, fill: "#cbbba9" }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="rating"
                stroke={chartStroke}
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#f49d25" }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-2">
        {recentFirst.length === 0 ? (
          <div className="rounded-2xl border border-mocha/10 bg-steam p-4 text-sm text-mocha/80 shadow-card">
            No brews logged yet.
          </div>
        ) : (
          recentFirst.map((entry) => {
            const beanName = beans.find((bean) => bean.id === entry.beanId)?.beanName ?? "Unknown Bean";
            const isOpen = expandedId === entry.id;

            return (
              <article key={entry.id} className="rounded-2xl border border-mocha/10 bg-steam shadow-card">
                <button
                  type="button"
                  onClick={() => setExpandedId((current) => (current === entry.id ? null : entry.id))}
                  className="w-full px-4 py-3 text-left"
                >
                  <p className="text-base font-semibold text-espresso">{methodLabel(entry.methodId)}</p>
                  <p className="text-sm text-mocha/85">{beanName}</p>
                  <p className="mt-1 text-xs text-mocha/70">
                    {new Date(entry.createdAt).toLocaleDateString("en-IN")} · Rating:{" "}
                    {typeof entry.rating === "number" ? `${entry.rating}/10` : "--/10"}
                  </p>
                  <p className="mt-1 text-xs text-mocha/75">
                    Coaching: {entry.coachingFeedback ?? "No coaching suggestion yet"}
                  </p>
                </button>

                {isOpen ? (
                  <div className="border-t border-mocha/10 px-4 py-3 text-sm text-espresso">
                    <p className="font-semibold">Brew details</p>
                    <p className="mt-1 text-mocha/80">
                      {entry.coffeeGrams}g coffee · {entry.waterMl}ml water · {entry.grindSize} grind
                    </p>
                    <p className="mt-1 text-mocha/80">Brew time: {entry.brewTime}</p>
                    <p className="mt-2 font-semibold">Coaching response</p>
                    <p className="mt-1 text-mocha/80">
                      {entry.coachingFeedback ?? "No coaching response captured for this brew."}
                    </p>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
