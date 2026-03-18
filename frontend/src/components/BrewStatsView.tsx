"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import type { FreestyleBrewEntry } from "@/lib/brewHistoryStore";
import type { UserBean } from "@/lib/types";

type TimeRange = "7d" | "30d" | "all";
type DonutMode = "bean" | "roaster";

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "all", label: "All Time" },
];

const DONUT_COLORS = ["#f49d25", "#de8b19", "#b5711a", "#8a5515", "#5e3a10", "#c47a1a", "#a06312", "#7a4c0e"];

function rollingAverage(data: { date: string; rating: number }[], window: number) {
  return data.map((point, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    const avg = slice.reduce((sum, p) => sum + p.rating, 0) / slice.length;
    return { ...point, avg: Math.round(avg * 10) / 10 };
  });
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

interface BrewStatsViewProps {
  entries: FreestyleBrewEntry[];
  beans: UserBean[];
}

export function BrewStatsView({ entries, beans }: BrewStatsViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [donutMode, setDonutMode] = useState<DonutMode>("bean");

  // Filter entries by time range
  const filtered = useMemo(() => {
    if (timeRange === "all") return entries;
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - (timeRange === "7d" ? 7 : 30));
    return entries.filter((e) => new Date(e.createdAt) >= cutoff);
  }, [entries, timeRange]);

  // Summary stats
  const totalBrews = filtered.length;
  const ratedBrews = filtered.filter((e) => typeof e.rating === "number" && e.rating > 0);
  const avgRating = ratedBrews.length > 0
    ? Math.round((ratedBrews.reduce((s, e) => s + (e.rating ?? 0), 0) / ratedBrews.length) * 10) / 10
    : 0;
  const totalGrams = Math.round(filtered.reduce((s, e) => s + (e.coffeeGrams ?? 0), 0));
  const avgGramsPerBrew = totalBrews > 0 ? Math.round(totalGrams / totalBrews * 10) / 10 : 0;

  // Rating over time — rolling avg of 5
  const ratingData = useMemo(() => {
    const rated = [...filtered]
      .filter((e) => typeof e.rating === "number" && e.rating > 0)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((e) => ({ date: formatShortDate(e.createdAt), rating: e.rating as number }));
    return rollingAverage(rated, 5);
  }, [filtered]);

  // % change badge
  const pctChange = useMemo(() => {
    if (ratingData.length < 2) return null;
    const first = ratingData[0].avg;
    const last = ratingData[ratingData.length - 1].avg;
    if (first === 0) return null;
    return Math.round(((last - first) / first) * 100 * 10) / 10;
  }, [ratingData]);

  // Bean distribution
  const beanMap = useMemo(() => {
    const map = new Map<string, UserBean>();
    for (const b of beans) map.set(b.id, b);
    return map;
  }, [beans]);

  const donutData = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const e of filtered) {
      if (!e.beanId) continue;
      const bean = beanMap.get(e.beanId);
      if (!bean) continue;
      const key = donutMode === "bean" ? e.beanId : bean.roaster;
      const label = donutMode === "bean" ? `${bean.roaster} — ${bean.beanName}` : bean.roaster;
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
      } else {
        counts.set(key, { label, count: 1 });
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        name: item.label,
        value: item.count,
        pct: totalBrews > 0 ? Math.round((item.count / totalBrews) * 100) : 0,
      }));
  }, [filtered, beanMap, donutMode, totalBrews]);

  // Top bean
  const topBean = donutData.length > 0 ? donutData[0].name : "—";

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="px-4 py-16 text-center flex flex-col items-center">
        <img
          src="/coffee_coach_searching.png"
          alt="Coach Kapi searching"
          width={160}
          height={160}
          style={{ mixBlendMode: "screen" }}
        />
        <p className="mt-4 text-base font-semibold text-slate-200">Nothing to analyse yet.</p>
        <p className="mt-2 text-sm text-slate-400 max-w-xs">
          Log a few brews and Coach Kapi will start finding patterns in your brewing.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-4 pb-4">
      {/* Time range filter */}
      <div className="flex gap-2">
        {TIME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTimeRange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              timeRange === opt.value
                ? "bg-primary text-background-dark border-primary"
                : "bg-primary/10 border-primary/20 text-primary/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-center">
          <span className="material-symbols-outlined text-primary text-base">local_cafe</span>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mt-1">Total Brews</p>
          <p className="text-2xl font-bold text-slate-100">{totalBrews}</p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-center">
          <span className="material-symbols-outlined text-primary text-base">star</span>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mt-1">Avg Rating</p>
          <p className="text-2xl font-bold text-slate-100">{avgRating || "—"}</p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-center">
          <span className="material-symbols-outlined text-primary text-base">scale</span>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mt-1">Beans Used</p>
          <p className="text-2xl font-bold text-slate-100">{totalGrams}<span className="text-xs font-normal text-slate-400">g</span></p>
        </div>
      </div>

      {/* Rating Over Time */}
      {ratingData.length >= 2 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Rating Over Time</p>
              <p className="text-lg font-bold text-slate-100">Taste Consistency</p>
            </div>
            {pctChange !== null && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pctChange >= 0 ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                {pctChange >= 0 ? "+" : ""}{pctChange}%
              </span>
            )}
          </div>
          <div className="h-40 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ratingData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f49d25" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f49d25" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 10]}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#221a10",
                    border: "1px solid rgba(244,157,37,0.2)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#f6efe4",
                  }}
                  formatter={(value: number) => [value.toFixed(1), "Avg Rating"]}
                />
                <Area
                  type="monotone"
                  dataKey="avg"
                  stroke="#f49d25"
                  strokeWidth={2}
                  fill="url(#ratingGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Beans Distribution */}
      {donutData.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Beans Distribution</p>
            <div className="flex gap-1">
              <button
                onClick={() => setDonutMode("bean")}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                  donutMode === "bean"
                    ? "bg-primary text-background-dark border-primary"
                    : "bg-primary/10 border-primary/20 text-primary/70"
                }`}
              >
                By Bean
              </button>
              <button
                onClick={() => setDonutMode("roaster")}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                  donutMode === "roaster"
                    ? "bg-primary text-background-dark border-primary"
                    : "bg-primary/10 border-primary/20 text-primary/70"
                }`}
              >
                By Roaster
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#221a10",
                      border: "1px solid rgba(244,157,37,0.2)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#f6efe4",
                    }}
                    formatter={(value: number, name: string) => [`${value} brews`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-bold text-slate-100">{totalBrews}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Brews</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
            {donutData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                />
                <span className="text-xs text-slate-300 truncate">{item.name}</span>
                <span className="text-[10px] text-slate-500 shrink-0">({item.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bean detail stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Avg Grams/Brew</p>
          <p className="text-xl font-bold text-slate-100 mt-1">{avgGramsPerBrew}<span className="text-xs font-normal text-slate-400">g</span></p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Top Bean</p>
          <p className="text-sm font-bold text-slate-100 mt-1 truncate">{topBean}</p>
        </div>
      </div>
    </div>
  );
}
