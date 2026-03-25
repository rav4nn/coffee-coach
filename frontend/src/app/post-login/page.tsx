"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { useGuestBrewStore } from "@/lib/guestBrewStore";

export default function PostLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const reset = useGuestBrewStore((s) => s.reset);
  const hasRun = useRef(false);

  useEffect(() => {
    // Wait until session is confirmed
    if (status !== "authenticated") return;
    // Run once only
    if (hasRun.current) return;
    hasRun.current = true;

    const encoded = searchParams.get("guestBrew");

    if (!encoded) {
      // No guest brew — just go home
      router.replace("/");
      return;
    }

    async function persistAndRedirect() {
      try {
        const guestData = JSON.parse(atob(encoded!));

        // 1. Create the brew
        const brewRes = await fetch("/api/brews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brew_type: "freestyle",
            method_id: guestData.methodId,
            coffee_grams: guestData.coffeeGrams,
            water_ml: guestData.waterMl,
            water_temp_c: guestData.waterTempC,
            grind_size: guestData.grindSize ?? "Medium",
            brew_time: guestData.brewTime,
            notes: guestData.beanName ? `Bean: ${guestData.beanName}` : null,
          }),
        });

        if (!brewRes.ok) throw new Error("Failed to save brew");
        const brew = await brewRes.json() as { id: string };

        // 2. Attach rating + coaching result
        const patches: Record<string, unknown> = { rating: guestData.rating };
        if (guestData.coachingResult) {
          patches.coaching_feedback = guestData.coachingResult.fix;
          patches.coaching_changes = guestData.coachingResult.changes;
          patches.coached = true;
        }
        await fetch(`/api/brews/${brew.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patches),
        });

        // 3. Clear guest store
        reset();

        // 4. Toast + redirect to coaching page
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "coffee-coach-home-toast",
            "Your first brew has been saved!"
          );
        }

        if (guestData.coachingResult) {
          router.replace(`/coach/brew/${brew.id}`);
        } else {
          router.replace("/");
        }
      } catch {
        // Fallback — just go home
        reset();
        router.replace("/");
      }
    }

    void persistAndRedirect();
  }, [status, searchParams, router, reset]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="w-24 h-24">
        <Image
          src="/coach/coffee_coach_thinking.png"
          alt="Coach Kapi"
          width={96}
          height={96}
          className="w-full h-full object-contain"
          style={{ mixBlendMode: "screen" }}
          priority
        />
      </div>
      <p className="text-slate-400 text-sm">Saving your brew…</p>
    </main>
  );
}
