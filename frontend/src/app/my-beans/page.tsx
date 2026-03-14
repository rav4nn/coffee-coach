"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";

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

type FilterTab = "all" | "whole" | "ground";

export default function MyBeansPage() {
  const { userBeans, fetchBeans, addBean, deleteBean, isLoading } = useBeansStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [roasters, setRoasters] = useState<string[]>([]);
  const [catalogBeans, setCatalogBeans] = useState<CatalogBean[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [deletingBeanId, setDeletingBeanId] = useState<string | null>(null);

  const form = useForm<AddBeanFormValues>({
    resolver: zodResolver(addBeanSchema),
    defaultValues: { roaster: "", coffeeId: "", roastDate: "", isPreGround: false },
  });

  const selectedRoaster = form.watch("roaster");
  const selectedCoffeeId = form.watch("coffeeId");
  const isPreGround = form.watch("isPreGround");

  const roasterOptions = useMemo(
    () => roasters.map((r) => ({ label: r, value: r })),
    [roasters],
  );
  const beanOptions = useMemo(
    () => catalogBeans.map((b) => ({ label: b.name, value: b.coffee_id })),
    [catalogBeans],
  );

  useEffect(() => { fetchBeans(); }, [fetchBeans]);

  useEffect(() => {
    getCatalogRoasters()
      .then(setRoasters)
      .catch(() => setRoasters([]));
  }, []);

  useEffect(() => {
    if (!selectedRoaster) {
      setCatalogBeans([]);
      form.setValue("coffeeId", "");
      return;
    }
    setCatalogLoading(true);
    getCatalogBeansByRoaster(selectedRoaster)
      .then(setCatalogBeans)
      .catch(() => setCatalogBeans([]))
      .finally(() => setCatalogLoading(false));
  }, [selectedRoaster, form]);

  async function onSubmit(values: AddBeanFormValues) {
    const selectedBean = catalogBeans.find((b) => b.coffee_id === values.coffeeId);
    if (!selectedBean) return;
    try {
      await addBean({
        coffee_id: values.coffeeId,
        roast_date: values.roastDate?.trim() ? values.roastDate : null,
        is_pre_ground: values.isPreGround,
        name: selectedBean.name,
        roaster: selectedBean.roaster,
      });
      form.reset({ roaster: "", coffeeId: "", roastDate: "", isPreGround: false });
      setCatalogBeans([]);
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
      const matchesFilter =
        filterTab === "all" ||
        (filterTab === "ground" && bean.isPreGround) ||
        (filterTab === "whole" && !bean.isPreGround);
      return matchesSearch && matchesFilter;
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
      <div className="flex gap-3 px-4 py-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {(["all", "whole", "ground"] as FilterTab[]).map((tab) => {
          const labels: Record<FilterTab, string> = { all: "All Beans", whole: "Whole Bean", ground: "Ground" };
          const active = filterTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`flex h-9 shrink-0 items-center justify-center gap-1 rounded-full px-4 text-sm font-semibold transition-colors ${
                active
                  ? "bg-primary text-background-dark"
                  : "bg-primary/10 text-primary/80 border border-primary/20"
              }`}
            >
              {labels[tab]}
              {tab !== "all" && (
                <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bean list */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-4">
        {isLoading && (
          <p className="text-sm text-slate-500 text-center py-8">Loading your beans…</p>
        )}

        {!isLoading && userBeans.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-primary/60">coffee</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">No beans yet</h2>
            <p className="text-sm text-slate-500 max-w-xs">
              Add your first bag so the brew flow can start with bean-first selection.
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

        {/* Bean cards
            Style reference (commented-out mock shapes):
            { id: "1", roaster: "Blue Tokai", beanName: "Attikan Estate", roastDate: "2023-10-20", isPreGround: false }
            { id: "2", roaster: "Third Wave", beanName: "El Diablo Blend", roastDate: "2023-11-12", isPreGround: true }
        */}
        {filteredBeans.map((bean) => {
          const days = bean.roastDate
            ? Math.floor((Date.now() - new Date(bean.roastDate).getTime()) / 86_400_000)
            : null;

          // Freshness zones: 0–7 Resting, 7–21 Peak Fresh, 21–45 Good, 45+ Aging
          // Track displayed over 60 days max
          const TRACK_MAX = 60;
          const clampedDays = days !== null ? Math.min(days, TRACK_MAX) : null;
          const pct = clampedDays !== null ? (clampedDays / TRACK_MAX) * 100 : null;

          const freshness = days === null
            ? null
            : days < 7
            ? { label: "Resting", sublabel: "Let it degas a few more days", color: "text-sky-400", trackColor: "bg-sky-400" }
            : days <= 21
            ? { label: "Peak Fresh", sublabel: "Perfect window — brew it now", color: "text-green-400", trackColor: "bg-green-400" }
            : days <= 45
            ? { label: "Good", sublabel: "Still tasty, flavours softening", color: "text-primary", trackColor: "bg-primary" }
            : { label: "Aging", sublabel: "Past peak — use it up soon", color: "text-slate-400", trackColor: "bg-slate-400" };

          return (
          <article
            key={bean.id}
            className="flex flex-col gap-3 rounded-xl bg-primary/5 border border-primary/10 p-4"
          >
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                {bean.imageUrl ? (
                  <Image
                    src={bean.imageUrl}
                    alt={bean.beanName}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-3xl text-primary/50">coffee</span>
                )}
              </div>
              <div className="flex flex-col justify-between py-0.5 flex-1 min-w-0">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-primary text-xs font-bold uppercase tracking-wider truncate">
                      {bean.roaster}
                    </p>
                    <span
                      className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        bean.isPreGround
                          ? "bg-primary/10 text-primary/60"
                          : "bg-primary/20 text-primary"
                      }`}
                    >
                      {bean.isPreGround ? "GROUND" : "WHOLE"}
                    </span>
                  </div>
                  <p className="text-slate-100 text-base font-bold leading-tight mt-0.5 truncate">
                    {bean.beanName}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-primary/40">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <p className="text-xs font-medium">Roasted: {formatRoastDate(bean.roastDate)}</p>
                </div>
              </div>
            </div>

            {/* Freshness slider */}
            {freshness && pct !== null && days !== null && (
              <div className="pt-1 pb-0.5">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className={`text-xs font-bold ${freshness.color}`}>{freshness.label}</span>
                  <span className="text-[10px] text-slate-500">{days}d since roast</span>
                </div>
                {/* Track */}
                <div className="relative h-2 rounded-full bg-primary/10 overflow-hidden">
                  {/* Zone markers */}
                  <div className="absolute inset-y-0 left-0 bg-sky-400/25 rounded-full" style={{ width: `${(7 / TRACK_MAX) * 100}%` }} />
                  <div className="absolute inset-y-0 bg-green-400/25" style={{ left: `${(7 / TRACK_MAX) * 100}%`, width: `${(14 / TRACK_MAX) * 100}%` }} />
                  <div className="absolute inset-y-0 bg-primary/25" style={{ left: `${(21 / TRACK_MAX) * 100}%`, width: `${(24 / TRACK_MAX) * 100}%` }} />
                  <div className="absolute inset-y-0 bg-slate-500/20 rounded-r-full" style={{ left: `${(45 / TRACK_MAX) * 100}%`, right: 0 }} />
                  {/* Fill up to current position */}
                  <div className={`absolute inset-y-0 left-0 rounded-full ${freshness.trackColor}`} style={{ width: `${pct}%`, opacity: 0.9 }} />
                </div>
                {/* Zone labels */}
                <div className="flex justify-between mt-1" style={{ fontSize: "9px" }}>
                  <span className="text-sky-400/60 font-semibold">Rest</span>
                  <span className="text-green-400/60 font-semibold">Peak</span>
                  <span className="text-primary/60 font-semibold">Good</span>
                  <span className="text-slate-500 font-semibold">Aging</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 italic">{freshness.sublabel}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-primary/10">
              <button
                onClick={() => setDeletingBeanId(bean.id)}
                className="flex-1 h-9 rounded-lg bg-primary/10 text-primary text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
                aria-label={`Delete ${bean.beanName}`}
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Remove
              </button>
              <Link
                href="/log-brew"
                className="flex-1 h-9 rounded-lg bg-primary text-background-dark text-sm font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
              >
                <span className="material-symbols-outlined text-sm">coffee</span>
                Brew Now
              </Link>
            </div>
          </article>
          );
        })}
      </div>

      {/* Delete confirmation overlay */}
      {deletingBeanId && (() => {
        const bean = userBeans.find((b) => b.id === deletingBeanId);
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-background-dark/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border border-primary/20 bg-[#2a1d11] p-6 shadow-2xl">
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
            className="fixed bottom-24 right-6 flex size-14 items-center justify-center rounded-full bg-primary text-background-dark shadow-xl hover:scale-105 transition-transform active:scale-95 z-20"
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
