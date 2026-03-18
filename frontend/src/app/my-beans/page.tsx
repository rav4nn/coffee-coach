"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";
import Link from "next/link";

import { SearchableCombobox } from "@/components/SearchableCombobox";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getCatalogBeansByRoaster, getCatalogRoasters } from "@/lib/api";
import { useBeansStore } from "@/lib/beansStore";
import type { CatalogBean } from "@/lib/types";

const addBeanSchema = z.object({
  roaster: z.string().min(1, "Roaster is required"),
  coffeeId: z.string().min(1, "Bean name is required"),
  roastDate: z.string().optional().refine(
    (v) => !v || v <= new Date().toISOString().split("T")[0],
    { message: "Roast date cannot be in the future" },
  ),
  isPreGround: z.boolean().default(false),
  bagWeightGrams: z.coerce.number({ invalid_type_error: "Enter bag weight" }).positive("Must be greater than 0"),
});

type AddBeanFormValues = z.infer<typeof addBeanSchema>;

function formatRoastDate(date: string | null) {
  if (!date) return "Unknown roast date";
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type FilterTab = "all" | "degassing" | "in_zone" | "fading" | "running_low";

export default function MyBeansPage() {
  const { userBeans, fetchBeans, addBean, deleteBean, restockBean, isLoading } = useBeansStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [restockingBeanId, setRestockingBeanId] = useState<string | null>(null);
  const [restockValue, setRestockValue] = useState<string>("");
  const [roasters, setRoasters] = useState<string[]>([]);
  const [catalogBeans, setCatalogBeans] = useState<CatalogBean[]>([]);
  const [customCatalogBeans, setCustomCatalogBeans] = useState<CatalogBean[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [deletingBeanId, setDeletingBeanId] = useState<string | null>(null);

  const form = useForm<AddBeanFormValues>({
    resolver: zodResolver(addBeanSchema),
    defaultValues: { roaster: "", coffeeId: "", roastDate: "", isPreGround: false, bagWeightGrams: undefined },
  });

  const selectedRoaster = form.watch("roaster");
  const selectedCoffeeId = form.watch("coffeeId");
  const isPreGround = form.watch("isPreGround");

  const roasterOptions = useMemo(
    () => roasters.map((r) => ({ label: r, value: r })),
    [roasters],
  );
  const beanOptions = useMemo(() => {
    const seen = new Set<string>();
    return [...catalogBeans, ...customCatalogBeans]
      .filter((b) => {
        if (seen.has(b.name)) return false;
        seen.add(b.name);
        return true;
      })
      .map((b) => ({ label: b.name, value: b.coffee_id }));
  }, [catalogBeans, customCatalogBeans]);

  useEffect(() => { fetchBeans(); }, [fetchBeans]);

  useEffect(() => {
    getCatalogRoasters()
      .then(setRoasters)
      .catch(() => setRoasters([]));
  }, []);

  useEffect(() => {
    if (!selectedRoaster) {
      setCatalogBeans([]);
      setCustomCatalogBeans([]);
      form.setValue("coffeeId", "");
      return;
    }
    setCustomCatalogBeans([]);
    form.setValue("coffeeId", "");
    setCatalogLoading(true);
    getCatalogBeansByRoaster(selectedRoaster)
      .then(setCatalogBeans)
      .catch(() => setCatalogBeans([]))
      .finally(() => setCatalogLoading(false));
  }, [selectedRoaster, form]);

  async function onSubmit(values: AddBeanFormValues) {
    const allBeans = [...catalogBeans, ...customCatalogBeans];
    const selectedBean = allBeans.find((b) => b.coffee_id === values.coffeeId);
    if (!selectedBean) return;
    const isCustom = values.coffeeId === "__custom__";
    try {
      await addBean({
        ...(isCustom ? {} : { coffee_id: values.coffeeId }),
        name: selectedBean.name,
        roaster: selectedBean.roaster,
        roast_date: values.roastDate?.trim() ? values.roastDate : null,
        is_pre_ground: values.isPreGround,
        bag_weight_grams: values.bagWeightGrams,
      });
      form.reset({ roaster: "", coffeeId: "", roastDate: "", isPreGround: false, bagWeightGrams: undefined });
      setCatalogBeans([]);
      setCustomCatalogBeans([]);
      setSheetOpen(false);
    } catch {
      form.setError("root", { message: "Failed to save bean. Please try again." });
    }
  }

  const filteredBeans = useMemo(() => {
    return userBeans.filter((bean) => {
      const matchesSearch =
        !search ||
        bean.beanName.toLowerCase().includes(search.toLowerCase()) ||
        bean.roaster.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (filterTab === "all") return true;
      const days = bean.roastDate
        ? Math.floor((Date.now() - new Date(bean.roastDate).getTime()) / 86_400_000)
        : null;
      if (filterTab === "degassing") return days !== null && days < 7;
      if (filterTab === "in_zone") return days !== null && days >= 7 && days <= 21;
      if (filterTab === "fading") return days !== null && days > 21;
      if (filterTab === "running_low")
        return bean.bagWeightGrams !== null && bean.remainingGrams !== null &&
          bean.remainingGrams < bean.bagWeightGrams * 0.2;
      return true;
    });
  }, [userBeans, search, filterTab]);

  return (
    <main className="flex flex-col min-h-full pb-28">
      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 h-12 rounded-xl bg-primary/10 px-4">
          <span className="material-symbols-outlined text-primary/60">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your coffee collection"
            className="flex-1 bg-transparent text-slate-100 placeholder:text-primary/40 text-sm outline-none"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {(["all", "degassing", "in_zone", "fading", "running_low"] as FilterTab[]).map((tab) => {
          const labels: Record<FilterTab, string> = {
            all: "All",
            degassing: "Degassing",
            in_zone: "In the Zone",
            fading: "Fading",
            running_low: "Running Low",
          };
          const active = filterTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`flex h-8 shrink-0 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors ${
                active
                  ? "bg-primary text-background-dark"
                  : "bg-primary/10 text-primary/80 border border-primary/20"
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Bean list */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-4">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-primary/5 border border-primary/10 overflow-hidden animate-pulse">
            <div className="flex items-stretch">
              <div className="w-32 shrink-0 min-h-[148px] bg-primary/10" />
              <div className="flex-1 p-4 flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2 pr-8">
                  <div className="h-2.5 w-16 rounded-full bg-primary/10" />
                  <div className="h-4 w-36 rounded-full bg-primary/15" />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-2.5 w-28 rounded-full bg-primary/10" />
                  <div className="h-2.5 w-20 rounded-full bg-primary/10" />
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-primary/10 flex flex-col gap-2">
              <div className="h-2 rounded-full bg-primary/10" />
              <div className="h-2 rounded-full bg-primary/10" />
            </div>
          </div>
        ))}

        {!isLoading && userBeans.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <img
              src="/coach/coffee_coach_pointing.png"
              alt="Coach Kapi pointing"
              width={160}
              height={160}
              style={{ mixBlendMode: "screen" }}
            />
            <h2 className="text-lg font-bold text-slate-100">No beans yet</h2>
            <p className="text-sm text-slate-500 max-w-xs">
              Add your first bag and Coach Kapi will personalise your brewing from the very first cup.
            </p>
            <button
              onClick={() => setSheetOpen(true)}
              className="mt-2 bg-primary text-background-dark font-semibold text-sm px-6 py-3 rounded-xl hover:scale-[1.02] transition-transform"
            >
              Add Your First Beans
            </button>
          </div>
        )}

        {!isLoading && userBeans.length > 0 && filteredBeans.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">No beans match your search.</p>
        )}

        {filteredBeans.map((bean) => {
          const days = bean.roastDate
            ? Math.floor((Date.now() - new Date(bean.roastDate).getTime()) / 86_400_000)
            : null;

          const TRACK_MAX = 60;
          const clampedDays = days !== null ? Math.min(days, TRACK_MAX) : null;
          const pct = clampedDays !== null ? (clampedDays / TRACK_MAX) * 100 : null;

          const freshness = days === null
            ? null
            : days < 7
            ? { label: "Degassing", color: "text-sky-400", trackColor: "bg-sky-400" }
            : days <= 21
            ? { label: "In the Zone", color: "text-green-400", trackColor: "bg-green-400" }
            : days <= 45
            ? { label: "Fading", color: "text-primary", trackColor: "bg-primary" }
            : { label: "Aging", color: "text-slate-400", trackColor: "bg-slate-400" };

          const isRunningLow = bean.bagWeightGrams !== null && bean.remainingGrams !== null &&
            bean.remainingGrams < bean.bagWeightGrams * 0.2;

          return (
          <article
            key={bean.id}
            className="rounded-xl bg-primary/5 border border-primary/10 overflow-hidden"
          >
            {/* Image + info row */}
            <div className="flex items-stretch">
              {/* Image */}
              <div className="w-32 shrink-0 relative bg-primary/10 min-h-[148px]">
                {bean.imageUrl ? (
                  <Image
                    src={bean.imageUrl}
                    alt={bean.beanName}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl text-primary/30">coffee</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 p-4 flex flex-col justify-between min-w-0 relative">
                <button
                  type="button"
                  onClick={() => setDeletingBeanId(bean.id)}
                  className="absolute top-3 right-3 flex items-center justify-center size-6 rounded-md bg-primary/10 text-primary/60 hover:bg-primary/20 hover:text-primary transition-colors"
                  aria-label={`Delete ${bean.beanName}`}
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>

                <div className="pr-8">
                  <p className="text-primary text-[10px] font-bold uppercase tracking-wider truncate">
                    {bean.roaster}
                  </p>
                  <p className="text-slate-100 text-base font-bold leading-snug mt-0.5 line-clamp-2">
                    {bean.beanName}
                  </p>
                </div>

                <div className="mt-3 flex flex-col gap-1">
                  <p className="text-xs text-slate-500">
                    {bean.roastDate ? `Roasted ${formatRoastDate(bean.roastDate)}` : "Roast date unknown"}
                  </p>
                  {bean.bagWeightGrams !== null && bean.remainingGrams !== null && (
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs ${
                        bean.remainingGrams <= 0
                          ? "text-red-400"
                          : isRunningLow
                          ? "text-amber-400"
                          : "text-slate-500"
                      }`}>
                        {bean.remainingGrams <= 0
                          ? "Bag empty"
                          : `${Math.max(0, bean.remainingGrams).toFixed(0)}g left${isRunningLow ? " · running low" : ""}`}
                      </p>
                      <button
                        type="button"
                        onClick={() => { setRestockingBeanId(bean.id); setRestockValue(String(Math.max(0, bean.remainingGrams!))); }}
                        className="text-[10px] text-primary/50 font-semibold hover:text-primary transition-colors shrink-0"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Freshness bar */}
            {freshness && pct !== null && days !== null && (
              <div className="px-4 pt-3 pb-4 border-t border-primary/10">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className={`text-xs font-bold ${freshness.color}`}>{freshness.label}</span>
                  <span className="text-[10px] text-slate-500">{days}d since roast</span>
                </div>
                <div className="relative h-2 rounded-full bg-primary/10 overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-sky-400/25 rounded-full" style={{ width: `${(7 / TRACK_MAX) * 100}%` }} />
                  <div className="absolute inset-y-0 bg-green-400/25" style={{ left: `${(7 / TRACK_MAX) * 100}%`, width: `${(14 / TRACK_MAX) * 100}%` }} />
                  <div className="absolute inset-y-0 bg-primary/25" style={{ left: `${(21 / TRACK_MAX) * 100}%`, width: `${(24 / TRACK_MAX) * 100}%` }} />
                  <div className="absolute inset-y-0 bg-slate-500/20 rounded-r-full" style={{ left: `${(45 / TRACK_MAX) * 100}%`, right: 0 }} />
                  <div className={`absolute inset-y-0 left-0 rounded-full ${freshness.trackColor}`} style={{ width: `${pct}%`, opacity: 0.9 }} />
                </div>
                <div className="flex justify-between mt-1" style={{ fontSize: "9px" }}>
                  <span className="text-sky-400/60 font-semibold">Rest</span>
                  <span className="text-green-400/60 font-semibold">Peak</span>
                  <span className="text-primary/60 font-semibold">Good</span>
                  <span className="text-slate-500 font-semibold">Aging</span>
                </div>
              </div>
            )}
          </article>
          );
        })}
      </div>

      {/* Restock overlay */}
      {restockingBeanId && (() => {
        const bean = userBeans.find((b) => b.id === restockingBeanId);
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-background-dark/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border border-primary/20 bg-[#2a1d11] p-6 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary">scale</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-1">Update Remaining Grams</h2>
              <p className="text-sm text-slate-400 mb-4">
                {bean ? `${bean.roaster} — ${bean.beanName}` : ""}
              </p>
              <input
                type="number"
                min="0"
                value={restockValue}
                onChange={(e) => setRestockValue(e.target.value)}
                className="w-full h-12 rounded-xl border border-primary/20 bg-primary/5 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary/40 mb-5"
                placeholder="Grams remaining"
              />
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    const grams = parseFloat(restockValue);
                    if (!isNaN(grams) && grams >= 0) {
                      await restockBean(restockingBeanId, grams);
                      setRestockingBeanId(null);
                    }
                  }}
                  className="w-full bg-primary text-background-dark font-bold py-3 rounded-xl hover:brightness-110 transition-all"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setRestockingBeanId(null)}
                  className="w-full border border-slate-600 text-slate-400 font-medium py-3 rounded-xl hover:text-slate-200 hover:border-slate-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete confirmation overlay */}
      {deletingBeanId && (() => {
        const bean = userBeans.find((b) => b.id === deletingBeanId);
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-background-dark/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-sm rounded-2xl border border-primary/20 bg-[#2a1d11] p-6 shadow-2xl">
              <button
                type="button"
                onClick={() => setDeletingBeanId(null)}
                className="absolute top-4 right-4 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-slate-400 hover:text-slate-100 hover:bg-primary/20 transition-colors"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary">delete</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-1">Remove bean?</h2>
              <p className="text-sm text-slate-400 mb-6">
                {bean ? `"${bean.roaster} — ${bean.beanName}" will be removed from your collection.` : "This bean will be removed from your collection."}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => { deleteBean(deletingBeanId); setDeletingBeanId(null); }}
                  className="w-full bg-primary text-background-dark font-bold py-3 rounded-xl hover:brightness-110 transition-all"
                >
                  Yes, Remove
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingBeanId(null)}
                  className="w-full border border-slate-600 text-slate-400 font-medium py-3 rounded-xl hover:text-slate-200 hover:border-slate-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Add Button + Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <button
            className="fixed bottom-36 right-6 flex size-14 items-center justify-center rounded-full bg-primary text-background-dark shadow-xl hover:scale-105 transition-transform active:scale-95 z-20"
            aria-label="Add beans"
          >
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </SheetTrigger>

        <SheetContent
          className="bg-[#2a1d11] border-t border-primary/20 text-slate-100 rounded-t-3xl px-0 pt-0 pb-8 max-h-[90dvh] overflow-y-auto"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-600" />
          </div>

          {/* Accessible title (sr-only) — visible title is the h2 below */}
          <SheetTitle className="sr-only">Add New Bean</SheetTitle>

          {/* Sheet header */}
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-xl font-bold text-slate-100">Add New Bean</h2>
            <button
              onClick={() => setSheetOpen(false)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-slate-400 hover:text-slate-100 transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 flex flex-col gap-5">
            {/* Roaster */}
            <div className="flex flex-col gap-2">
              <p className="text-primary text-xs font-bold uppercase tracking-wider">Select Roaster</p>
              <SearchableCombobox
                label=""
                placeholder="Select a roaster"
                searchPlaceholder="Search roasters…"
                value={selectedRoaster}
                onChange={(value) => form.setValue("roaster", value, { shouldValidate: true })}
                options={roasterOptions}
                onAddNew={(q) => {
                  setRoasters((prev) => (prev.includes(q) ? prev : [q, ...prev]));
                  form.setValue("roaster", q, { shouldValidate: true });
                }}
              />
              {form.formState.errors.roaster && (
                <p className="text-xs text-red-400">{form.formState.errors.roaster.message}</p>
              )}
            </div>

            {/* Bean variety */}
            <div className="flex flex-col gap-2">
              <p className="text-primary text-xs font-bold uppercase tracking-wider">Select Bean Variety</p>
              <SearchableCombobox
                label=""
                placeholder={selectedRoaster ? "Select a bean" : "Pick roaster first"}
                searchPlaceholder="Search beans…"
                value={selectedCoffeeId}
                onChange={(value) => form.setValue("coffeeId", value, { shouldValidate: true })}
                options={beanOptions}
                disabled={!selectedRoaster || catalogLoading}
                showEscapeHatch
                onAddNew={(q) => {
                  const custom: CatalogBean = { coffee_id: "__custom__", name: q, roaster: selectedRoaster };
                  setCustomCatalogBeans([custom]);
                  form.setValue("coffeeId", "__custom__", { shouldValidate: true });
                }}
              />
              {form.formState.errors.coffeeId && (
                <p className="text-xs text-red-400">{form.formState.errors.coffeeId.message}</p>
              )}
            </div>

            {/* Roast date + Format row */}
            <div className="flex gap-4">
              {/* Roast date */}
              <div className="flex flex-col gap-2 flex-1">
                <p className="text-primary text-xs font-bold uppercase tracking-wider">Roast Date</p>
                <input
                  id="roast-date"
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  {...form.register("roastDate")}
                  className="h-12 w-full rounded-xl border border-primary/20 bg-primary/5 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary/40 [color-scheme:dark]"
                />
                <p className="text-[10px] text-slate-500 leading-tight">
                  Helps dial in freshness advice.
                </p>
              </div>

              {/* Format segmented control */}
              <div className="flex flex-col gap-2">
                <p className="text-primary text-xs font-bold uppercase tracking-wider">Format</p>
                <div className="flex h-12 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => form.setValue("isPreGround", false, { shouldValidate: true })}
                    className={`flex-1 px-4 text-sm font-bold transition-colors ${
                      !isPreGround
                        ? "bg-primary/20 text-primary"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    WHOLE
                  </button>
                  <div className="w-px bg-primary/20" />
                  <button
                    type="button"
                    onClick={() => form.setValue("isPreGround", true, { shouldValidate: true })}
                    className={`flex-1 px-4 text-sm font-bold transition-colors ${
                      isPreGround
                        ? "bg-primary text-background-dark"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    GROUND
                  </button>
                </div>
              </div>
            </div>

            {/* Bag weight */}
            <div className="flex flex-col gap-2">
              <p className="text-primary text-xs font-bold uppercase tracking-wider">Bag Weight (g)</p>
              <input
                id="bag-weight"
                type="number"
                min="1"
                placeholder="e.g. 250"
                {...form.register("bagWeightGrams")}
                className="h-12 w-full rounded-xl border border-primary/20 bg-primary/5 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-600"
              />
              {form.formState.errors.bagWeightGrams && (
                <p className="text-xs text-red-400">{form.formState.errors.bagWeightGrams.message}</p>
              )}
              <p className="text-[10px] text-slate-500 leading-tight">
                Tracks how much coffee you have left as you brew.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full h-14 rounded-xl bg-primary text-background-dark text-base font-bold hover:scale-[1.01] transition-transform disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {form.formState.isSubmitting ? "Saving…" : "Save to My Beans"}
            </button>
            {form.formState.errors.root && (
              <p className="text-xs text-red-400 text-center">{form.formState.errors.root.message}</p>
            )}
          </form>
        </SheetContent>
      </Sheet>
    </main>
  );
}
