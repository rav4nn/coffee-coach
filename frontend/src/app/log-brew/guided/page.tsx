"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { getRecipesApi, type GuidedRecipe } from "@/lib/api";
import { useLogBrewStore } from "@/lib/logBrewStore";
import { Button } from "@/components/ui/button";

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `~${mins}:${String(secs).padStart(2, "0")}`;
}

export default function GuidedRecipesPage() {
  const selectedMethodId = useLogBrewStore((state) => state.selectedMethodId);
  const selectedPourOverDeviceId = useLogBrewStore((state) => state.selectedPourOverDeviceId);
  const [recipes, setRecipes] = useState<GuidedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const methodKey =
        selectedMethodId === "pour_over" ? (selectedPourOverDeviceId ?? "v60") : selectedMethodId;
      if (!methodKey) {
        setIsLoading(false);
        setHasError(true);
        return;
      }

      try {
        setHasError(false);
        const data = await getRecipesApi(methodKey);
        if (!mounted) {
          return;
        }
        setRecipes(data);
      } catch {
        if (mounted) {
          setHasError(true);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [selectedMethodId, selectedPourOverDeviceId]);

  const sorted = useMemo(
    () => [...recipes].sort((a, b) => (a.steps?.length ?? 999) - (b.steps?.length ?? 999)),
    [recipes],
  );

  if (hasError) {
    return (
      <section className="space-y-4 rounded-3xl border border-mocha/10 bg-steam p-5 shadow-card">
        <h1 className="font-serif text-3xl font-bold text-espresso">Could not load this recipe list</h1>
        <p className="text-sm text-mocha/80">Please go back and try again.</p>
        <Button asChild>
          <Link href="/log-brew/step-2">Back</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mocha/70">Guided Brew</p>
        <h1 className="font-serif text-4xl font-bold text-espresso">Pick a Recipe</h1>
      </div>

      {isLoading ? <p className="text-sm text-mocha/80">Loading recipes...</p> : null}

      {!isLoading && sorted.length === 0 ? (
        <div className="rounded-3xl border border-mocha/10 bg-steam p-5 shadow-card">
          <p className="text-sm text-mocha/80">No recipes found for this method.</p>
        </div>
      ) : null}

      <div className="max-h-[70vh] space-y-3 overflow-y-auto pb-2">
        {sorted.map((recipe) => (
          <Link
            key={recipe.recipe_id}
            href={`/log-brew/guided/${recipe.recipe_id}`}
            className="block rounded-3xl border border-mocha/10 bg-steam p-4 shadow-card transition-colors hover:bg-latte/30"
          >
            <h2 className="font-serif text-2xl font-semibold text-espresso">{recipe.title}</h2>
            <p className="mt-1 text-sm text-mocha/70">{recipe.author}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-latte/60 px-2.5 py-1 text-mocha">{recipe.coffee_g}g coffee</span>
              <span className="rounded-full bg-latte/60 px-2.5 py-1 text-mocha">{recipe.water_ml}ml water</span>
              <span className="rounded-full bg-latte/60 px-2.5 py-1 text-mocha">{recipe.water_temp_c}C</span>
              <span className="rounded-full bg-latte/60 px-2.5 py-1 text-mocha">{recipe.grind_size}</span>
            </div>
            <p className="mt-3 text-sm font-medium text-espresso">{formatTime(recipe.brew_time_seconds)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
