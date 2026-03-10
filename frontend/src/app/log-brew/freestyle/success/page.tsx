"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { BrewRatingSheet } from "@/components/BrewRatingSheet";
import { Button } from "@/components/ui/button";

function SuccessContent() {
  const searchParams = useSearchParams();
  const brewId = searchParams.get("brew_id") ?? "";
  const [sheetOpen, setSheetOpen] = useState(true);

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-mocha/10 bg-steam p-6 text-center shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mocha/70">Freestyle Brew</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-espresso">Brew Logged!</h1>
        <p className="mt-2 text-sm text-mocha/80">
          Your brew parameters were saved. Rate it below to get coaching, or head home.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          {brewId && (
            <button
              onClick={() => setSheetOpen(true)}
              className="h-12 w-full rounded-xl bg-primary text-background-dark font-bold text-base"
            >
              Rate & Get Coaching
            </button>
          )}
          <Button asChild variant="outline" className="h-12 w-full text-base">
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>

      {brewId && (
        <BrewRatingSheet
          brewId={brewId}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </section>
  );
}

export default function FreestyleSuccessPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-mocha/70">Loading…</div>}>
      <SuccessContent />
    </Suspense>
  );
}
