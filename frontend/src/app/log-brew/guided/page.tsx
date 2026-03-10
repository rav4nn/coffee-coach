"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getRecipesApi, type GuidedRecipe } from "@/lib/api";
import { useLogBrewStore } from "@/lib/logBrewStore";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";
import { useBeansStore } from "@/lib/beansStore";

function methodLabel(methodId: string | null | undefined) {
  if (!methodId) return "Brew";
  return methodId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")} min`;
}

export default function GuidedRecipesPage() {
  const router = useRouter();
  const selectedMethodId = useLogBrewStore((state) => state.selectedMethodId);
  const selectedPourOverDeviceId = useLogBrewStore((state) => state.selectedPourOverDeviceId);
  const entries = useBrewHistoryStore((state) => state.entries);
  const fetchEntries = useBrewHistoryStore((state) => state.fetchEntries);
  const beans = useBeansStore((state) => state.userBeans);
  const fetchBeans = useBeansStore((state) => state.fetchBeans);
  const [recipes, setRecipes] = useState<GuidedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    void fetchEntries();
    void fetchBeans();
  }, [fetchEntries, fetchBeans]);

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
        if (!mounted) return;
        setRecipes(data);
      } catch {
        if (mounted) setHasError(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [selectedMethodId, selectedPourOverDeviceId]);

  const sorted = useMemo(
    () => [...recipes].sort((a, b) => (a.steps?.length ?? 999) - (b.steps?.length ?? 999)),
    [recipes],
  );

  const favouriteBrews = useMemo(
    () => entries.filter((e) => e.isFavourite),
    [entries],
  );

  if (hasError) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <span className="material-symbols-outlined text-5xl text-primary/40">error</span>
        <h1 className="text-xl font-bold text-slate-100 text-center">Could not load recipes</h1>
        <p className="text-sm text-slate-400 text-center">Please go back and try again.</p>
        <Link
          href="/log-brew/step-2"
          className="inline-flex items-center gap-2 text-sm font-bold text-primary"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back
        </Link>
      </main>
    );
  }

  return (
    <>
      {/* Sticky header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-background-dark/80 backdrop-blur-md z-10 border-b border-primary/10">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center size-10 rounded-full hover:bg-primary/10 transition-colors"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined text-slate-100">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
            Guided Brew
          </span>
          <h1 className="text-lg font-bold text-slate-100">Pick a Recipe</h1>
        </div>
        <div className="flex items-center justify-center size-10 rounded-full bg-primary text-background-dark font-bold text-sm">
          BJ
        </div>
      </header>

      {/* Recipe list */}
      <main className="flex-1 overflow-y-auto pb-32">
        <div className="px-4 py-6 space-y-4">

          {/* ── Favourite brews ── */}
          {favouriteBrews.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">favorite</span>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Your Favourites</p>
              </div>
              {favouriteBrews.map((entry) => {
                const beanName = beans.find((b) => b.id === entry.beanId)?.beanName ?? "Unknown Bean";
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => router.push(`/log-brew/guided/${entry.id}`)}
                    className="w-full rounded-xl border border-primary/30 bg-primary/5 p-4 text-left hover:border-primary/60 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-100 truncate">
                          Your {methodLabel(entry.methodId)} · {beanName}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {entry.coffeeGrams}g · {entry.waterMl}ml
                          {entry.waterTempC ? ` · ${entry.waterTempC}°C` : ""}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-primary shrink-0">chevron_right</span>
                    </div>
                  </button>
                );
              })}
              <div className="border-t border-primary/10 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">All Recipes</p>
              </div>
            </div>
          )}

          {isLoading && (
            <p className="text-sm text-slate-400 text-center py-8">Loading recipes…</p>
          )}

          {!isLoading && sorted.length === 0 && (
            <div className="rounded-xl border border-primary/10 bg-primary/5 p-5 text-center">
              <p className="text-sm text-slate-400">No recipes found for this method.</p>
            </div>
          )}

          {sorted.map((recipe) => {
            const isSelected = selectedRecipeId === recipe.recipe_id;
            return (
              <button
                key={recipe.recipe_id}
                type="button"
                onClick={() => setSelectedRecipeId(recipe.recipe_id)}
                className={`group relative w-full overflow-hidden rounded-xl p-4 text-left transition-all ${
                  isSelected
                    ? "bg-primary/5 border border-primary/20"
                    : "bg-background-dark border border-primary/10 hover:border-primary/40"
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="space-y-2 pr-10">
                    <h3 className="text-xl font-bold leading-tight text-slate-100">
                      {recipe.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-y-2 pt-2 border-t border-primary/10">
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined text-sm">scale</span>
                        <span className="text-xs">{recipe.coffee_g}g coffee</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined text-sm">water_drop</span>
                        <span className="text-xs">{recipe.water_ml}ml water</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined text-sm">thermostat</span>
                        <span className="text-xs">{recipe.water_temp_c}°C</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined text-sm">timer</span>
                        <span className="text-xs">{formatTime(recipe.brew_time_seconds)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4 flex items-center justify-center size-8 rounded-full bg-primary/20 border border-primary/30">
                    <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* Start Brew button */}
      <div className="fixed bottom-[72px] left-0 w-full px-4 pb-4 bg-gradient-to-t from-background-dark via-background-dark/90 to-transparent pt-8">
        <button
          type="button"
          disabled={!selectedRecipeId}
          onClick={() => selectedRecipeId && router.push(`/log-brew/guided/${selectedRecipeId}`)}
          className="w-full bg-primary text-background-dark font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] transition-all"
        >
          Start Brew
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </>
  );
}
