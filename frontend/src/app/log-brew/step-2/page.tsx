"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ListOrdered, PencilLine } from "lucide-react";

import recipes from "@/data/recipes.json";
import { Button } from "@/components/ui/button";
import { useLogBrewStore } from "@/lib/logBrewStore";

type Choice = "guided" | "freestyle";

type RecipeRecord = {
  method?: string;
};

function toRecipeMethodKey(selectedMethodId: string | null, selectedPourOverDeviceId: string | null) {
  if (!selectedMethodId) {
    return null;
  }

  if (selectedMethodId === "pour_over") {
    return selectedPourOverDeviceId ?? "v60";
  }

  return selectedMethodId;
}

function prettyMethodName(methodKey: string | null) {
  if (!methodKey) {
    return "selected method";
  }

  switch (methodKey) {
    case "v60":
      return "V60";
    case "chemex":
      return "Chemex";
    case "kalita_wave":
      return "Kalita Wave";
    case "clever_dripper":
      return "Clever Dripper";
    case "aeropress":
      return "AeroPress";
    case "french_press":
      return "French Press";
    case "moka_pot":
      return "Moka Pot";
    case "cold_brew":
      return "Cold Brew";
    default:
      return methodKey.replace(/_/g, " ");
  }
}

export default function LogBrewStepTwoPage() {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice | null>(null);
  const selectedMethodId = useLogBrewStore((state) => state.selectedMethodId);
  const selectedPourOverDeviceId = useLogBrewStore((state) => state.selectedPourOverDeviceId);

  const recipeMethodKey = useMemo(
    () => toRecipeMethodKey(selectedMethodId, selectedPourOverDeviceId),
    [selectedMethodId, selectedPourOverDeviceId],
  );

  const recipeCount = useMemo(() => {
    if (!recipeMethodKey) {
      return 0;
    }

    return (recipes as RecipeRecord[]).filter((recipe) => recipe.method === recipeMethodKey).length;
  }, [recipeMethodKey]);

  function handleNext() {
    if (!choice) {
      return;
    }

    router.push(choice === "guided" ? "/log-brew/guided" : "/log-brew/freestyle");
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-mocha/10 bg-steam px-4 py-3 shadow-card">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-mocha/75">Step 2 of 2</p>
        <div className="mt-2 flex gap-1">
          <span className="h-1.5 w-7 rounded-full bg-mocha/40" />
          <span className="h-1.5 w-7 rounded-full bg-mocha" />
        </div>
      </div>

      <div>
        <h1 className="font-serif text-4xl font-bold text-espresso">Choose Your Logging Style</h1>
        <p className="mt-1 text-sm text-mocha/80">Pick how you want to continue this brew session.</p>
      </div>

      {!selectedMethodId ? (
        <div className="rounded-3xl border border-mocha/10 bg-steam p-4 shadow-card">
          <p className="text-sm text-mocha/80">Step 1 selection is missing. Choose bean and method first.</p>
          <Button asChild className="mt-3">
            <Link href="/log-brew">Back to Step 1</Link>
          </Button>
        </div>
      ) : null}

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setChoice("guided")}
          className={`w-full rounded-2xl border p-4 text-left shadow-card transition-colors ${
            choice === "guided" ? "border-mocha bg-latte/60" : "border-mocha/15 bg-stone-100"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-cream p-2.5">
              <ListOrdered className="h-8 w-8 text-charcoal" />
            </div>
            <div className="min-w-0">
              <h2 className="font-serif text-2xl font-semibold text-espresso">Follow a Recipe</h2>
              <p className="text-sm text-mocha/80">We&apos;ll guide you step by step</p>
              <span className="mt-2 inline-flex rounded-full border border-mocha/20 bg-cream px-2.5 py-1 text-xs text-mocha">
                {recipeCount} recipes for {prettyMethodName(recipeMethodKey)}
              </span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setChoice("freestyle")}
          className={`w-full rounded-2xl border p-4 text-left shadow-card transition-colors ${
            choice === "freestyle" ? "border-mocha bg-latte/50" : "border-mocha/10 bg-stone-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-cream p-2.5">
              <PencilLine className="h-8 w-8 text-charcoal" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-semibold text-espresso">Use My Own Recipe</h2>
              <p className="text-sm text-mocha/75">Just log what you brew</p>
            </div>
          </div>
        </button>
      </div>

      <Button className="h-12 w-full text-base" disabled={!choice || !selectedMethodId} onClick={handleNext}>
        Next
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </section>
  );
}
