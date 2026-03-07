"use client";

import { useState } from "react";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppHeader() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const userName = "Coffee Coach";
  const initials = getInitials(userName);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-mocha/10 bg-steam/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-phone items-center justify-between px-4">
          <div>
            <p className="font-serif text-xl font-bold tracking-tight text-espresso">
              Coffee Coach
            </p>
            <p className="text-xs text-mocha/70">Brew, rate, improve</p>
          </div>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-mocha text-sm font-semibold text-cream shadow-card"
            aria-label="Open profile settings"
          >
            {initials}
          </button>
        </div>
      </header>
      {sheetOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close profile drawer"
            className="absolute inset-0 bg-charcoal/35"
            onClick={() => setSheetOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-[22rem] max-w-[88vw] flex-col border-l border-mocha/10 bg-steam p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="font-serif text-2xl font-bold text-espresso">Profile</p>
                <p className="text-sm text-mocha/70">Settings will live here.</p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="rounded-full border border-mocha/20 px-3 py-1 text-sm text-mocha"
              >
                Close
              </button>
            </div>
            <div className="rounded-3xl border border-mocha/10 bg-cream p-4 shadow-card">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mocha font-semibold text-cream">
                  {initials}
                </div>
                <div>
                  <p className="font-medium text-espresso">Coffee Coach User</p>
                  <p className="text-sm text-mocha/70">Single-user profile placeholder</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-mocha/80">
                <p>Profile settings drawer scaffolded.</p>
                <p>Future settings and account controls can attach here.</p>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
