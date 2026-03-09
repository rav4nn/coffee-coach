"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

const WEEKLY_BREWS = 4;
const WEEKLY_GOAL = 7;

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const displayName = user?.name ?? "Brewer";
  const progress = Math.round((WEEKLY_BREWS / WEEKLY_GOAL) * 100);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[78%] max-w-sm bg-background-dark border-l border-primary/10 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Profile header */}
        <div className="relative p-8 pb-6 flex flex-col items-center text-center">
          <button
            onClick={onClose}
            className="absolute top-6 left-6 text-slate-500 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          {/* Avatar */}
          <div className="w-24 h-24 rounded-full border-2 border-primary overflow-hidden mb-4 flex items-center justify-center bg-primary/20">
            {user?.avatar ? (
              <Image src={`/avatars/${user.avatar}.png`} alt={displayName} width={96} height={96} className="w-full h-full object-cover" />
            ) : user?.image ? (
              <Image src={user.image} alt={displayName} width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-primary">{getInitials(displayName)}</span>
            )}
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-100">{displayName}</h2>
          <p className="text-sm text-primary font-medium uppercase tracking-widest mt-1">
            Master Brewer
          </p>
        </div>

        {/* Weekly Mastery */}
        <div className="px-8 py-5 border-y border-primary/10">
          <div className="flex justify-between items-end mb-3">
            <span className="text-sm font-medium text-slate-400">Weekly Mastery</span>
            <span className="text-lg font-bold text-primary">
              {WEEKLY_BREWS}
              <span className="text-sm font-normal text-slate-500"> / {WEEKLY_GOAL} brews</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-1">
            {[
              { icon: "person", label: "Account Info" },
              { icon: "shield_person", label: "Privacy Settings" },
              { icon: "settings", label: "Settings" },
            ].map(({ icon, label }) => (
              <li key={label}>
                <button className="flex items-center gap-4 w-full px-4 py-4 rounded-xl hover:bg-primary/5 transition-colors group text-left">
                  <span className="material-symbols-outlined text-slate-500 group-hover:text-primary">
                    {icon}
                  </span>
                  <span className="text-base font-medium text-slate-300 group-hover:text-slate-100">
                    {label}
                  </span>
                  <span className="material-symbols-outlined ml-auto text-slate-500 text-sm">
                    chevron_right
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom actions */}
        <div className="p-8 border-t border-primary/10">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center justify-center gap-2 w-full py-4 border border-primary/30 rounded-xl text-primary font-bold tracking-widest text-sm uppercase hover:bg-primary/10 transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
            Sign Out
          </button>
          <p className="text-center text-[10px] text-slate-500 mt-6 uppercase tracking-[0.2em] opacity-50">
            Version 1.0.0 • Roasted with care
          </p>
        </div>
      </div>
    </>
  );
}
