"use client";

import { useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";

import { GreetingSection } from "@/components/GreetingSection";
import { QuickActions } from "@/components/QuickActions";
import { BrewList } from "@/components/BrewList";
import { CoachTip } from "@/components/CoachTip";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";
import { useBeansStore } from "@/lib/beansStore";

function methodLabel(methodId: string | null | undefined) {
  if (!methodId) return "Unknown Method";
  return methodId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function trendPattern(ratings: number[]) {
  if (ratings.length < 4) return "Building trend data";
  const diffs = ratings.slice(1).map((v, i) => v - ratings[i]);
  const positives = diffs.filter((d) => d > 0).length;
  const negatives = diffs.filter((d) => d < 0).length;
  const directionChanges = diffs.slice(1).filter((d, i) => d * diffs[i] < 0).length;
  if (directionChanges >= 2) return "Oscillating";
  if (positives > negatives + 1) return "Improving";
  if (negatives > positives + 1) return "Worsening";
  return "Plateau";
}

function timeAgo(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Home() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "Brewer";

  const entries = useBrewHistoryStore((state) => state.entries);
  const fetchEntries = useBrewHistoryStore((state) => state.fetchEntries);
  const beans = useBeansStore((state) => state.userBeans);
  const fetchBeans = useBeansStore((state) => state.fetchBeans);

  useEffect(() => {
    void fetchEntries();
    void fetchBeans();
  }, [fetchEntries, fetchBeans]);

  const recentFirst = useMemo(
    () => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries],
  );

  const brews = recentFirst.slice(0, 5).map((entry) => {
    const beanName = beans.find((b) => b.id === entry.beanId)?.beanName ?? "Unknown Bean";
    return {
      id: Number(entry.id),
      name: beanName,
      method: methodLabel(entry.methodId),
      rating: entry.rating ?? 0,
      timeAgo: timeAgo(entry.createdAt),
      icon: "coffee",
    };
  });

  const sortedByDate = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const ratings = sortedByDate
    .map((e) => e.rating)
    .filter((r): r is number => typeof r === "number");
  const trend = trendPattern(ratings);

  const latestCoaching = recentFirst.find((e) => e.coachingFeedback)?.coachingFeedback;
  const tip =
    latestCoaching ??
    (trend !== "Building trend data"
      ? `Your recent brews are ${trend.toLowerCase()}. Keep tracking to unlock personalised coaching.`
      : "Log a few brews to start getting personalised coaching tips.");

  return (
    <main className="overflow-y-auto pb-28">
      <GreetingSection greetingLabel="Hello" userName={`Brewmaster ${firstName}`} />
      <QuickActions />
      <BrewList brews={brews} />
      <CoachTip tip={tip} />
    </main>
  );
}
