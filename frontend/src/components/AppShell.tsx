"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

const SHELL_FREE_ROUTES = ["/login", "/onboarding", "/account-info"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideShell = SHELL_FREE_ROUTES.some((r) => pathname.startsWith(r));

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <AppHeader />
      <div className="flex-1 w-full mx-auto max-w-phone">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
