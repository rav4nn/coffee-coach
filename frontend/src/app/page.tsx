"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { ProfileDrawer } from "@/components/ProfileDrawer";

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function Home() {
  const { data: session } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const user = session?.user;

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background-dark/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 max-w-phone mx-auto">
          <div className="w-10" />
          <h1 className="text-xl font-bold text-slate-100">Coffee Coach</h1>
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
        {/* Hero Section */}
        <div className="flex flex-col items-center px-6 pt-8 pb-2">
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
            Ready for your best brew?
          </h2>
          <p className="text-slate-400 text-sm text-center mt-2 leading-relaxed max-w-xs">
            Coach is here to help you dial in the perfect cup.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pt-6 pb-4 space-y-3">
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
      </main>

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
