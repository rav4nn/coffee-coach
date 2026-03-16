"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { useBrewSessionStore } from "@/lib/brewSessionStore";
import { MyBeansIcon } from "@/components/MyBeansIcon";

const LEFT_ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/log-brew", label: "Log Brew", icon: "add_circle" },
];

const RIGHT_ITEMS = [
  { href: "/my-beans", label: "My Beans", renderIcon: () => <MyBeansIcon className="h-6 w-6" /> },
  { href: "/history", label: "Journal", icon: "menu_book" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const isBrewingActive = useBrewSessionStore((state) => state.isBrewingActive);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  }

  function NavItem({
    href,
    label,
    icon,
    renderIcon,
  }: {
    href: string;
    label: string;
    icon?: string;
    renderIcon?: () => ReactNode;
  }) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={`flex flex-col items-center gap-1 ${active ? "text-primary" : "text-slate-500"}`}
      >
        {renderIcon ? (
          renderIcon()
        ) : (
          <span
            className="material-symbols-outlined"
            style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {icon}
          </span>
        )}
        <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>{label}</span>
      </Link>
    );
  }

  const coachActive = isActive("/coach");

  return (
    <nav className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-phone border-t border-primary/10 bg-background-dark/95 backdrop-blur-md px-4 pb-6 pt-3 z-50 transition-transform duration-300 ease-in-out ${isBrewingActive ? "translate-y-[calc(100%+2rem)]" : "translate-y-0"}`}>
      <div className="grid grid-cols-5 items-end">
        <div className="flex justify-center">
          <NavItem {...LEFT_ITEMS[0]} />
        </div>
        <div className="flex justify-center">
          <NavItem {...LEFT_ITEMS[1]} />
        </div>

        {/* Centre Coach FAB */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center -mt-8 relative">
            <Link href="/coach" className="flex flex-col items-center gap-1">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-primary/30 transition-colors ${coachActive ? "bg-primary" : "bg-primary/80"}`}>
                <Image
                  src="/coach/img3_whistle_blowing.png"
                  alt="Coach"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain p-1"
                />
              </div>
              <span className={`text-[10px] mt-0.5 ${coachActive ? "text-primary font-bold" : "text-slate-400 font-medium"}`}>
                Coach
              </span>
            </Link>
          </div>
        </div>

        <div className="flex justify-center">
          <NavItem {...RIGHT_ITEMS[0]} />
        </div>
        <div className="flex justify-center">
          <NavItem {...RIGHT_ITEMS[1]} />
        </div>
      </div>
    </nav>
  );
}
