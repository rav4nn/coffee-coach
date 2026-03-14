"use client";

import Link from "next/link";
import { MyBeansIcon } from "@/components/MyBeansIcon";
import { usePathname } from "next/navigation";
import { History, House, SquarePlus } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: House },
  { href: "/log-brew", label: "Log Brew", icon: SquarePlus },
  { href: "/my-beans", label: "My Beans", icon: null },
  { href: "/history", label: "History", icon: History },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-mocha/15 bg-cream/95 px-3 py-2 backdrop-blur-md">
      <div className="mx-auto grid w-full max-w-phone grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const isMyBeans = item.href === "/my-beans";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] transition-colors",
                active ? "text-mocha font-bold" : "text-charcoal font-medium hover:text-espresso",
              ].join(" ")}
            >
              {isMyBeans ? (
                <MyBeansIcon className="h-[18px] w-[18px]" />
              ) : (
                Icon && <Icon className="h-[18px] w-[18px]" />
              )}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
