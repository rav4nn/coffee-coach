"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { useBrewSessionStore } from "@/lib/brewSessionStore";
import { ProfileDrawer } from "@/components/ProfileDrawer";

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppHeader() {
  const isBrewingActive = useBrewSessionStore((state) => state.isBrewingActive);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  if (pathname.startsWith("/log-brew")) return null;

  const user = session?.user;

  return (
    <>
      <header
        className={`sticky top-0 z-10 bg-background-dark/80 backdrop-blur-md overflow-hidden transition-all duration-300 ease-in-out ${
          isBrewingActive ? "max-h-0 opacity-0" : "max-h-24 opacity-100"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 max-w-phone mx-auto w-full">
          <button className="flex items-center justify-center p-2 rounded-full hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined text-slate-300">coffee_maker</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Coffee Coach</h1>
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 rounded-full border-2 border-primary/30 bg-primary/20 flex items-center justify-center flex-shrink-0 hover:border-primary/60 hover:bg-primary/30 transition-colors overflow-hidden"
            aria-label="Open profile"
          >
            {user?.avatar ? (
              <Image
                src={`/avatars/${user.avatar}.png`}
                alt={user.name ?? "Profile"}
                width={40}
                height={40}
                className="w-full h-full object-cover rounded-full"
              />
            ) : user?.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "Profile"}
                width={40}
                height={40}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-sm font-bold text-primary">{getInitials(user?.name)}</span>
            )}
          </button>
        </div>
      </header>

      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
