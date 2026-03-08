import type { ReactNode } from "react";

import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
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
