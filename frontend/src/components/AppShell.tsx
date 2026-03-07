import type { ReactNode } from "react";

import { AppHeader } from "@/components/AppHeader";
import { Navbar } from "@/components/Navbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-24">
      <AppHeader />
      <main className="mx-auto w-full max-w-phone px-4 py-6">{children}</main>
      <Navbar />
    </div>
  );
}
