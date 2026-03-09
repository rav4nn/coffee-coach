"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useBrewSessionStore } from "@/lib/brewSessionStore";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/log-brew", label: "Log Brew", icon: "add_circle" },
  { href: "/my-beans", label: "My Beans", icon: "nutrition" },
  { href: "/history", label: "History", icon: "history" },
];

export function BottomNav() {
  const pathname = usePathname();
  const isBrewingActive = useBrewSessionStore((state) => state.isBrewingActive);

  return (
    <nav className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-phone border-t border-primary/10 bg-background-dark/95 backdrop-blur-md px-4 pb-6 pt-3 z-50 transition-transform duration-300 ease-in-out ${isBrewingActive ? "translate-y-full" : "translate-y-0"}`}>
      <div className="flex justify-between items-center px-6">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 ${
                active ? "text-primary" : "text-slate-500"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
