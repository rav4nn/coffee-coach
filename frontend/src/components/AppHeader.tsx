"use client";

import { usePathname, useRouter } from "next/navigation";

import { useBrewSessionStore } from "@/lib/brewSessionStore";

export function AppHeader() {
  const isBrewingActive = useBrewSessionStore((state) => state.isBrewingActive);
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith("/log-brew")) return null;
  if (pathname === "/") return null;

  const isBrewCoachPage = pathname.startsWith("/coach/brew/");

  return (
    <header
      className={`sticky top-0 z-10 bg-background-dark/80 backdrop-blur-md overflow-hidden transition-all duration-300 ease-in-out ${
        isBrewingActive ? "max-h-0 opacity-0" : "max-h-24 opacity-100"
      }`}
    >
      <div className="relative flex items-center justify-center px-4 py-3 max-w-phone mx-auto w-full">
        {isBrewCoachPage && (
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-3 flex items-center justify-center size-10 rounded-full hover:bg-primary/10 transition-colors"
            aria-label="Go back"
          >
            <span className="material-symbols-outlined text-slate-100">arrow_back</span>
          </button>
        )}
        <h1 className="text-2xl text-slate-100 tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Coffee Coach</h1>
      </div>
    </header>
  );
}
