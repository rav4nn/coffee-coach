"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { BrewEditSheet } from "@/components/BrewEditSheet";
import { ProfileDrawer } from "@/components/ProfileDrawer";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";
import { useBeansStore } from "@/lib/beansStore";
import { Skeleton } from "@/components/Skeleton";

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "MORNING, BREWER";
  if (h >= 12 && h < 17) return "AFTERNOON, BREWER";
  if (h >= 17 && h < 21) return "EVENING, BREWER";
  return "NIGHT OWL, BREWER";
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

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
  return `1:${Math.round(waterMl / coffeeGrams)} Ratio`;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}


export default function Home() {
  const router = useRouter();
  const { status: sessionStatus, data: session } = useSession();

  const entries = useBrewHistoryStore((state) => state.entries);
  const isLoadingHistory = useBrewHistoryStore((state) => state.loading);
  const fetchEntries = useBrewHistoryStore((state) => state.fetchEntries);
  const beans = useBeansStore((state) => state.userBeans);
  const fetchBeans = useBeansStore((state) => state.fetchBeans);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editBrewId, setEditBrewId] = useState<string | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    Promise.all([fetchEntries(), fetchBeans()]).finally(() => setInitialFetchDone(true));
  }, [fetchEntries, fetchBeans]);

  const isPageLoading = sessionStatus === "loading" || (!initialFetchDone && isLoadingHistory);

  const recentFirst = useMemo(
    () => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries],
  );

  const recentTwo = recentFirst.slice(0, 2);

  const streak = useMemo(() => {
    if (entries.length === 0) return 0;
    const brewDays = new Set(entries.map((e) => new Date(e.createdAt).toDateString()));
    let count = 0;
    const check = new Date();
    check.setHours(0, 0, 0, 0);
    if (!brewDays.has(check.toDateString())) {
      check.setDate(check.getDate() - 1);
    }
    while (brewDays.has(check.toDateString())) {
      count++;
      check.setDate(check.getDate() - 1);
    }
    return count;
  }, [entries]);

  const personalBest = useMemo(() => {
    const rated = entries.filter((e) => typeof e.rating === "number");
    if (rated.length === 0) return null;
    return rated.reduce((best, e) => (e.rating! > best.rating! ? e : best));
  }, [entries]);

  if (isPageLoading) {
    return (
      <main className="overflow-y-auto pb-28">
        <div className="px-4 pt-4 pb-3 grid grid-cols-2 gap-3">
          <div className="h-20 rounded-2xl bg-primary/5 border border-primary/10 animate-pulse" />
          <div className="h-20 rounded-2xl bg-primary/5 border border-primary/10 animate-pulse" />
        </div>
        <div className="px-4 pb-4 space-y-3">
          <div className="h-14 rounded-2xl bg-primary/10 animate-pulse" />
          <div className="h-14 rounded-2xl bg-primary/5 border border-primary/10 animate-pulse" />
        </div>
        <section className="px-4 py-4">
          <Skeleton className="h-5 w-28 mb-3" />
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-2xl border border-primary/10 bg-primary/5 overflow-hidden animate-pulse">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-32 bg-primary/15" />
                    <Skeleton className="h-3 w-40 bg-primary/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  const editEntry = editBrewId ? entries.find((e) => e.id === editBrewId) ?? null : null;
  const user = session?.user;

  return (
    <>
    <header className="sticky top-0 z-10 bg-background-dark/90 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 max-w-phone mx-auto">
        <button
          onClick={() => setProfileOpen(true)}
          className="w-10 h-10 rounded-full border-2 border-primary/30 bg-primary/20 flex items-center justify-center flex-shrink-0 hover:border-primary/60 transition-colors overflow-hidden"
          aria-label="Open profile"
        >
          {user?.image ? (
            <Image src={user.image} alt={user.name ?? "Profile"} width={40} height={40} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-sm font-bold text-primary">{getInitials(user?.name)}</span>
          )}
        </button>
        <div className="text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">{getGreeting()}</p>
          <p className="text-base font-bold text-slate-100 leading-tight">Coffee Coach</p>
        </div>
        <Link href="/settings" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-primary/10 transition-colors" aria-label="Settings">
          <span className="material-symbols-outlined text-slate-400">settings</span>
        </Link>
      </div>
    </header>

    <main className="overflow-y-auto pb-28">
      {/* Stat Cards */}
      {(streak > 0 || personalBest) && (
        <div className={`px-4 pt-4 pb-3 grid gap-3 ${streak > 0 && personalBest ? "grid-cols-2" : "grid-cols-1"}`}>
          {streak > 0 && (
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="material-symbols-outlined text-primary text-base">local_fire_department</span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Streak</p>
              </div>
              <p className="text-2xl font-bold text-primary leading-none">
                {streak}
                <span className="text-xs font-normal text-slate-400 ml-1">day{streak !== 1 ? "s" : ""}</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1">consecutive brewing</p>
            </div>
          )}
          {personalBest && (() => {
            const bean = beans.find((b) => b.id === personalBest.beanId);
            const beanLabel = bean ? `${bean.roaster} — ${bean.beanName}` : "Unknown Bean";
            return (
              <button
                type="button"
                onClick={() => router.push(`/history?expand=${personalBest.id}`)}
                className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-left w-full hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-primary text-base">emoji_events</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Best Brew</p>
                </div>
                <p className="text-2xl font-bold text-primary leading-none">
                  {personalBest.rating}
                  <span className="text-xs font-normal text-slate-400 ml-0.5">/10</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-1 truncate">{beanLabel}</p>
              </button>
            );
          })()}
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 py-3 space-y-3">
        <Link
          href="/log-brew"
          className="flex items-center justify-center gap-2 w-full bg-primary text-background-dark font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          Start New Brew
        </Link>
        <Link
          href="/coach"
          className="flex items-center justify-center gap-2 w-full bg-primary/5 border border-primary/20 text-slate-100 font-semibold py-4 rounded-2xl hover:scale-[1.01] transition-transform"
        >
          <Image src="/coach/img3_whistle_blowing.png" alt="" width={24} height={24} className="object-contain" />
          Get Coached
        </Link>
      </div>

      {/* Recent Brews */}
      <section className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-100">Recent Brews</h3>
          <Link href="/history" className="text-sm text-primary font-semibold flex items-center gap-0.5">
            See all
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        {recentTwo.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl bg-primary/5 border border-white/5 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-600">coffee</span>
            <p className="text-sm text-slate-500">No brews logged yet. Start your first brew!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTwo.map((entry) => {
              const bean = beans.find((b) => b.id === entry.beanId);
              const beanName = bean ? `${bean.roaster} — ${bean.beanName}` : "Unknown Bean";
              const isOpen = expandedId === entry.id;
              const icon = methodIcon(entry.methodId);

              return (
                <article
                  key={entry.id}
                  className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : entry.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <p className="text-sm font-bold text-slate-100 truncate">{beanName}</p>
                        <p className="text-xs text-slate-400 shrink-0">{formatTime(entry.createdAt)}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {methodLabel(entry.methodId)} · {ratio(entry.coffeeGrams, entry.waterMl)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {typeof entry.rating === "number" && (
                          <span className="flex items-center gap-0.5 text-xs text-primary font-semibold">
                            <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>star</span>
                            {entry.rating}/10
                          </span>
                        )}
                        {entry.notes && (
                          <p className="text-xs text-slate-500 italic truncate">{entry.notes}</p>
                        )}
                        {entry.isFavourite && (
                          <span className="material-symbols-outlined text-primary" style={{ fontSize: "13px" }}>favorite</span>
                        )}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-500 text-lg shrink-0">
                      {isOpen ? "expand_less" : "chevron_right"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-primary/15 px-4 py-4 space-y-4">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-primary/10 rounded-xl py-2 px-1">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Extraction</p>
                          <p className="text-sm font-bold text-slate-100 mt-0.5">{entry.brewTime}</p>
                        </div>
                        <div className="bg-primary/10 rounded-xl py-2 px-1">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Grind</p>
                          <p className="text-sm font-bold text-slate-100 mt-0.5">{entry.grindSize}</p>
                        </div>
                        <div className="bg-primary/10 rounded-xl py-2 px-1">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Temp</p>
                          <p className="text-sm font-bold text-slate-100 mt-0.5">
                            {entry.waterTempC ? entry.waterTempC + "°C" : "—"}
                          </p>
                        </div>
                      </div>

                      {entry.notes && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Notes</p>
                          <p className="text-sm text-slate-300 leading-relaxed">{entry.notes}</p>
                        </div>
                      )}

                      {entry.coachingFeedback && (
                        <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-primary/70 font-semibold mb-1">Coach Says</p>
                          <p className="text-sm text-slate-300">{entry.coachingFeedback}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setEditBrewId(entry.id)}
                          className="flex-1 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                          Edit Brew
                        </button>
                        <button
                          onClick={() => router.push(`/coach/brew/${entry.id}`)}
                          className="flex-1 h-10 rounded-xl bg-primary text-background-dark text-sm font-semibold flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">psychology</span>
                          Ask Coach
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <BrewEditSheet
        entry={editEntry}
        open={editBrewId !== null}
        onOpenChange={(o) => { if (!o) setEditBrewId(null); }}
      />
    </main>

    <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
