"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getRecipeByIdApi, type GuidedRecipe } from "@/lib/api";
import { useBrewSessionStore } from "@/lib/brewSessionStore";
import { useLogBrewStore } from "@/lib/logBrewStore";

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function GuidedRecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const startSession = useBrewSessionStore((state) => state.startSession);
  const selectedBeanId = useLogBrewStore((state) => state.selectedBeanId);
  const selectedMethodId = useLogBrewStore((state) => state.selectedMethodId);

  const [recipe, setRecipe] = useState<GuidedRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await getRecipeByIdApi(params.id);
        if (!mounted) {
          return;
        }

        if (!data || !Array.isArray(data.steps)) {
          setHasError(true);
          return;
        }

        setRecipe(data);
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
  }, [params.id]);

  const stepsPreview = useMemo(() => (recipe?.steps && Array.isArray(recipe.steps) ? recipe.steps : []), [recipe]);

  function handleStart() {
    if (!recipe || !Array.isArray(recipe.steps)) {
      return;
    }

    const pourByTime = new Map((recipe.pours ?? []).map((pour) => [pour.time_seconds, pour.target_water_g]));
    startSession({
      recipe_id: recipe.recipe_id,
      bean_id: selectedBeanId ?? null,
      method: selectedMethodId ?? recipe.method,
      started_at: new Date().toISOString(),
      steps: recipe.steps.map((step, index) => ({
        step_index: index,
        instruction: step.instruction,
        expected_duration_seconds: step.duration_seconds ?? null,
        actual_duration_seconds: null,
        expected_pour_weight_g: pourByTime.get(step.time_seconds) ?? null,
        actual_pour_weight_g: null,
        deviation_note: null,
        confirmed: false,
        completed_at: null,
      })),
    });

    router.push(`/log-brew/guided/${recipe.recipe_id}/brew`);
  }

  if (isLoading) {
    return <p className="text-sm text-mocha/80">Loading recipe...</p>;
  }

  if (hasError || !recipe) {
    return (
      <section className="space-y-4 rounded-3xl border border-mocha/10 bg-steam p-5 shadow-card">
        <h1 className="font-serif text-3xl font-bold text-espresso">Could not load this recipe</h1>
        <p className="text-sm text-mocha/80">Please go back and try a different recipe.</p>
        <Button asChild>
          <Link href="/log-brew/guided">Back</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mocha/70">Guided Brew</p>
        <h1 className="font-serif text-4xl font-bold text-espresso">{recipe.title}</h1>
        <p className="mt-1 text-sm text-mocha/75">{recipe.author}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-3xl border border-mocha/10 bg-steam p-4 text-sm shadow-card">
        <p className="rounded-xl bg-latte/40 px-3 py-2 text-mocha">Coffee: {recipe.coffee_g}g</p>
        <p className="rounded-xl bg-latte/40 px-3 py-2 text-mocha">Water: {recipe.water_ml}ml</p>
        <p className="rounded-xl bg-latte/40 px-3 py-2 text-mocha">Temp: {recipe.water_temp_c}C</p>
        <p className="rounded-xl bg-latte/40 px-3 py-2 text-mocha">Grind: {recipe.grind_size}</p>
        {recipe.bloom_water_g !== null && recipe.bloom_duration_seconds !== null ? (
          <p className="rounded-xl bg-latte/40 px-3 py-2 text-mocha">
            Bloom: {recipe.bloom_water_g}g / {recipe.bloom_duration_seconds}s
          </p>
        ) : null}
        <p className="rounded-xl bg-latte/40 px-3 py-2 text-mocha">Total: {formatTime(recipe.brew_time_seconds)}</p>
      </div>

      <div className="rounded-3xl border border-mocha/10 bg-steam p-4 shadow-card">
        <h2 className="font-serif text-2xl font-semibold text-espresso">Steps Preview</h2>
        {stepsPreview.length === 0 ? (
          <p className="mt-2 text-sm text-mocha/80">Could not load this recipe</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {stepsPreview.map((step, index) => (
              <li key={`${step.time_seconds}-${index}`} className="rounded-xl bg-latte/30 px-3 py-2 text-sm text-espresso">
                <span className="mr-2 font-semibold text-mocha">{index + 1}.</span>
                {step.instruction}
              </li>
            ))}
          </ol>
        )}
      </div>

      <Button className="h-12 w-full text-base" onClick={handleStart} disabled={stepsPreview.length === 0}>
        Start Brewing
      </Button>
    </section>
  );
}
