"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CompactFlowHeader } from "@/components/CompactFlowHeader";
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
  const selectedBeanId = useLogBrewStore((state) => state.selectedBeanId);
  const entries = useBrewHistoryStore((state) => state.entries);
  const fetchEntries = useBrewHistoryStore((state) => state.fetchEntries);
  const beans = useBeansStore((state) => state.userBeans);
  const fetchBeans = useBeansStore((state) => state.fetchBeans);
  const selectedBean = beans.find((b) => b.id === selectedBeanId);
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
        <h1 className="text-xl font-normal text-slate-100 text-center">Could not load recipes</h1>
        <p className="text-sm text-slate-400 text-center">Please go back and try again.</p>
        <Link
          href="/log-brew/step-2"
          className="inline-flex items-center gap-2 text-sm font-normal text-primary"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back
        </Link>
      </main>
    );
  }

  return (
    <>
      <CompactFlowHeader
        title="Pick a Recipe"
        onBack={() => router.back()}
        progressCount={3}
        currentStep={3}
        showProgress
      />

      {/* Context bar */}
      {selectedBean && (selectedMethodId || selectedPourOverDeviceId) && (
        <p className="mb-3 mt-2 px-4 text-center text-xs text-[#ffffff60]">
          {selectedBean.beanName} <span className="text-[#ffffff60]">·</span>{" "}
          {methodLabel(selectedMethodId === "pour_over" ? (selectedPourOverDeviceId ?? selectedMethodId) : selectedMethodId)}
        </p>
      )}

      {/* Recipe list */}
      <main
        className="flex-1 overflow-y-auto pb-56"
        style={{ scrollPaddingBottom: "88px" }}
      >
        <div className="space-y-4 px-4 pb-6">

          {/* ── Favourite brews ── */}
          {favouriteBrews.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">favorite</span>
                <p className="text-xs font-normal uppercase tracking-wider text-primary">Your Favourites</p>
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
                        <p className="truncate text-sm font-normal text-slate-100">
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
                <p className="text-xs font-normal uppercase tracking-wider text-slate-500">All Recipes</p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="space-y-4 animate-pulse">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-primary/10 bg-background-dark p-4">
                  <div className="h-6 bg-white/10 rounded-lg w-3/4 mb-3" />
                  <div className="grid grid-cols-2 gap-y-3 pt-3 border-t border-primary/10">
                    <div className="flex items-center gap-2">
                      <div className="size-4 rounded bg-white/10 shrink-0" />
                      <div className="h-3 bg-white/10 rounded w-20" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-4 rounded bg-white/10 shrink-0" />
                      <div className="h-3 bg-white/10 rounded w-16" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-4 rounded bg-white/10 shrink-0" />
                      <div className="h-3 bg-white/10 rounded w-14" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-4 rounded bg-white/10 shrink-0" />
                      <div className="h-3 bg-white/10 rounded w-18" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                    <h3 className="text-base font-normal leading-tight text-slate-100">
                      {recipe.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-y-2 pt-2 border-t border-primary/10">
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined text-sm">scale</span>
                        <span className="text-[11px] font-normal text-slate-400">
                          Coffee <span className="text-[13px] font-medium text-slate-100">{recipe.coffee_g}g</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined text-sm">water_drop</span>
                        <span className="text-[11px] font-normal text-slate-400">
                          Water <span className="text-[13px] font-medium text-slate-100">{recipe.water_ml}ml</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined text-sm">thermostat</span>
                        <span className="text-[11px] font-normal text-slate-400">
                          Temp <span className="text-[13px] font-medium text-slate-100">{recipe.water_temp_c}°C</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined text-sm">timer</span>
                        <span className="text-[11px] font-normal text-slate-400">
                          Time <span className="text-[13px] font-medium text-slate-100">{formatTime(recipe.brew_time_seconds)}</span>
                        </span>
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
      <div className="fixed bottom-36 left-0 right-0 z-30 max-w-phone mx-auto px-4">
        <button
          type="button"
          disabled={!selectedRecipeId}
          onClick={() => selectedRecipeId && router.push(`/log-brew/guided/${selectedRecipeId}`)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-normal text-background-dark shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start Brew
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </>
  );
}
