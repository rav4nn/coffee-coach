"use client";

import { Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const brewId = searchParams.get("brew_id") ?? "";

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4 text-center">
      <Image
        src="/coach/img3_hero_thumbs_up.png"
        alt="Coach celebrating"
        width={120}
        height={120}
        className="object-contain drop-shadow-lg mb-2"
      />
      <h1 className="text-3xl font-bold text-slate-100">Brew Logged!</h1>
      <p className="text-sm text-slate-400">
        Your brew parameters were saved. Rate it and get coaching, or head home.
      </p>
      <div className="w-full max-w-xs flex flex-col gap-3 mt-4">
        {brewId && (
          <Link
            href={`/coach/brew/${brewId}`}
            className="h-12 w-full rounded-xl bg-primary text-background-dark font-bold text-base flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">psychology</span>
            Rate & Get Coaching
          </Link>
        )}
        <Link
          href="/"
          className="h-12 w-full rounded-xl border border-primary/30 text-primary font-bold text-base flex items-center justify-center"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}

export default function FreestyleSuccessPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-400">Loading…</div>}>
      <SuccessContent />
    </Suspense>
  );
}
