"use client";

import { usePathname } from "next/navigation";

import { useBrewSessionStore } from "@/lib/brewSessionStore";

export function AppHeader() {
  const isBrewingActive = useBrewSessionStore((state) => state.isBrewingActive);
  const pathname = usePathname();

  if (pathname.startsWith("/log-brew")) return null;
  if (pathname === "/") return null;

  return (
    <header
      className={`sticky top-0 z-10 bg-background-dark/80 backdrop-blur-md overflow-hidden transition-all duration-300 ease-in-out ${
        isBrewingActive ? "max-h-0 opacity-0" : "max-h-24 opacity-100"
      }`}
    >
      <div className="flex items-center justify-center px-6 py-5 max-w-phone mx-auto w-full">
        <h1 className="text-2xl text-slate-100 tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Coffee Coach</h1>
      </div>
    </header>
  );
}
