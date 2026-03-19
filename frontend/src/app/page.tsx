"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { ProfileDrawer } from "@/components/ProfileDrawer";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";

const METHOD_LABELS: Record<string, string> = {
  pour_over: "Pour Over",
  aeropress: "AeroPress",
  french_press: "French Press",
  moka_pot: "Moka Pot",
  cold_brew: "Cold Brew",
  south_indian_filter: "Filter Kaapi",
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function Home() {
  const { data: session } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const [primaryMethod, setPrimaryMethod] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const entries = useBrewHistoryStore((state) => state.entries);
  const loading = useBrewHistoryStore((state) => state.loading);
  const fetchEntries = useBrewHistoryStore((state) => state.fetchEntries);

  const user = session?.user;
  const firstName = user?.name?.split(" ")[0] ?? "Brewer";

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    fetch("/api/users/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((u) => {
        const eq = u.primary_equipment as string[] | undefined;
        setPrimaryMethod(eq?.[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setProfileLoaded(true));
  }, []);

  const isLoading = loading || !profileLoaded;
  const isNewUser = !isLoading && entries.length === 0;

  return (
    <>
      <style>{`
        @keyframes kapiAppear {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .kapi-appear { animation: kapiAppear 0.8s ease forwards; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background-dark/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 max-w-phone mx-auto">
          <div className="w-10" />
          <h1 className="text-2xl text-slate-100 tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Coffee Coach</h1>
          <button
            onClick={() => setProfileOpen(true)}
            className="w-10 h-10 rounded-full border-2 border-primary/30 bg-primary/20 flex items-center justify-center flex-shrink-0 hover:border-primary/60 transition-colors overflow-hidden"
            aria-label="Open profile"
          >
            {user?.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "Profile"}
                width={40}
                height={40}
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-sm font-bold text-primary">{getInitials(user?.name)}</span>
            )}
          </button>
        </div>
      </header>

      <main className="overflow-y-auto pb-28">
        {isLoading ? (
          /* Loading — avoid flickering between states */
          <div className="flex items-center justify-center pt-32">
            <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        ) : isNewUser ? (
          /* ── NEW USER STATE ── */
          <>
            <div className="flex flex-col items-center px-6 pt-4 pb-2">
              <div className="w-60 h-60">
                <Image
                  src="/coach/img3_waving.png"
                  alt="Coach Kapi"
                  width={240}
                  height={240}
                  className="kapi-appear w-full h-full object-contain"
                  style={{ mixBlendMode: "screen" }}
                  priority
                />
              </div>

              {primaryMethod ? (
                <h2 className="text-3xl font-bold text-slate-100 text-center mt-4 leading-snug">
                  Welcome, <span className="text-primary">{firstName}.</span><br />
                  Let&apos;s brew your first <span className="text-primary">{METHOD_LABELS[primaryMethod] ?? primaryMethod}.</span>
                </h2>
              ) : (
                <h2 className="text-3xl font-bold text-slate-100 text-center mt-4 leading-snug">
                  Welcome, <span className="text-primary">{firstName}.</span><br />
                  <span className="text-primary">Let&apos;s log your first brew.</span>
                </h2>
              )}

              <p className="text-slate-400 text-sm text-center mt-2 leading-relaxed max-w-xs">
                Log a brew, rate it, and Coach Kapi will tell you exactly what to change next.
              </p>
            </div>

            <div className="px-6 pt-4 pb-4 space-y-3">
              <Link
                href="/log-brew"
                className="flex items-center justify-center gap-2 w-full bg-primary text-background-dark font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform"
              >
                <span className="material-symbols-outlined text-xl">add</span>
                Start Your First Brew
              </Link>
              <Link
                href="/my-beans"
                className="flex items-center justify-center gap-2 w-full bg-primary/10 border border-primary/20 text-slate-100 font-semibold py-4 rounded-2xl hover:scale-[1.01] transition-transform"
              >
                <span className="material-symbols-outlined text-xl">coffee</span>
                Explore Beans
              </Link>
            </div>
          </>
        ) : (
          /* ── RETURNING USER STATE ── */
          <>
            <div className="flex flex-col items-center px-6 pt-4 pb-2">
              <div className="w-52 h-52">
                <Image
                  src="/coach/img3_hero_thumbs_up.png"
                  alt="Coffee Coach"
                  width={208}
                  height={208}
                  className="w-full h-full object-contain drop-shadow-2xl"
                  priority
                />
              </div>
              <h2 className="text-3xl font-bold text-slate-100 text-center mt-4 leading-snug">
                Ready for your next brew, {firstName}?
              </h2>
              <p className="text-slate-400 text-sm text-center mt-2 leading-relaxed max-w-xs">
                Coach is here to help you dial in the perfect cup.
              </p>
            </div>

            <div className="px-6 pt-4 pb-4 space-y-3">
              <Link
                href="/log-brew"
                className="flex items-center justify-center gap-2 w-full bg-primary text-background-dark font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform"
              >
                <span className="material-symbols-outlined text-xl">add</span>
                Start New Brew
              </Link>
              <Link
                href="/history"
                className="flex items-center justify-center gap-2 w-full bg-primary/10 border border-primary/20 text-slate-100 font-semibold py-4 rounded-2xl hover:scale-[1.01] transition-transform"
              >
                <span className="material-symbols-outlined text-xl">schedule</span>
                Recent Brews
              </Link>
            </div>
          </>
        )}
      </main>

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
