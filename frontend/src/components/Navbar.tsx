"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/log-brew", label: "Log Brew" },
  { href: "/my-beans", label: "My Beans" },
  { href: "/history", label: "History" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-mocha/10 bg-steam/95 backdrop-blur">
      <div className="mx-auto grid w-full max-w-phone grid-cols-4 gap-2 px-3 py-3">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "rounded-2xl px-2 py-2 text-center text-xs font-medium transition-colors",
                active
                  ? "bg-mocha text-cream"
                  : "bg-latte/40 text-mocha hover:bg-latte/70",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
