import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

import "@/app/globals.css";
import { AppShell } from "@/components/AppShell";
import { AuthTokenSync } from "@/components/AuthTokenSync";

export const metadata: Metadata = {
  title: "Coffee Coach",
  description: "Mobile-first coffee brewing coach frontend",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SessionProvider>
          <AuthTokenSync />
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
