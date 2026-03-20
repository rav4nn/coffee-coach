"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";

import { SearchableCombobox } from "@/components/SearchableCombobox";
import { PlaceholderBeanIcon } from "@/components/icons/PlaceholderBeanIcon";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  ApiConflictError,
  type BeanSearchResultApi,
  type RoasterSearchResultApi,
  getCatalogBeansByRoaster,
  getCatalogRoasters,
  searchBeansApi,
  searchRoastersApi,
  submitBeanApi,
  submitRoasterApi,
} from "@/lib/api";
import { useBeansStore } from "@/lib/beansStore";

const addBeanSchema = z.object({
  roastDate: z.string().optional().refine(
    (v) => !v || v <= new Date().toISOString().split("T")[0],
    { message: "Roast date cannot be in the future" },
  ),
  isPreGround: z.boolean().default(false),
  bagWeightGrams: z.coerce.number({ invalid_type_error: "Enter bag weight" }).positive("Must be greater than 0"),
});

type AddBeanFormValues = z.infer<typeof addBeanSchema>;
type FilterTab = "all" | "degassing" | "in_zone" | "fading" | "running_low";
type SubmissionStatus = "pending" | "approved" | "rejected" | null;
type RoastProfile = "Light" | "Light-Medium" | "Medium" | "Medium-Dark" | "Dark";

type RoasterChoice = {
  id: string | null;
  name: string;
  source: "catalog" | "submitted";
  status: SubmissionStatus;
};

type BeanChoice = {
  id: string;
  name: string;
  source: "catalog" | "submitted";
  status: SubmissionStatus;
  roasterId: string | null;
  submittedRoasterId: string | null;
  wholeOrGround: "whole" | "ground" | null;
  roastProfile: RoastProfile | null;
  roastDate: string | null;
  roasterName: string;
};

type DuplicateState<T> = {
  query: string;
  matches: T[];
};

const ROAST_PROFILES: RoastProfile[] = ["Light", "Light-Medium", "Medium", "Medium-Dark", "Dark"];

function formatRoastDate(date: string | null) {
  if (!date) return "Unknown roast date";
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function roasterValue(roaster: RoasterChoice) {
  return roaster.source === "catalog" ? `catalog:${roaster.name}` : `submitted:${roaster.id}`;
}

function beanValue(bean: BeanChoice) {
  return `${bean.source}:${bean.id}`;
}

function dedupeRoasters(items: RoasterChoice[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.source}:${item.id ?? item.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeBeans(items: BeanChoice[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.source}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapRoasterResult(result: RoasterSearchResultApi): RoasterChoice {
  return {
    id: result.id,
    name: result.name,
    source: result.source,
    status: result.status,
  };
}

function mapBeanResult(result: BeanSearchResultApi, selectedRoaster: RoasterChoice | null): BeanChoice {
  return {
    id: result.id,
    name: result.name,
    source: result.source,
    status: result.status,
    roasterId: result.roaster_id,
    submittedRoasterId: result.submitted_roaster_id,
    wholeOrGround: result.whole_or_ground ?? null,
    roastProfile: result.roast_profile ?? null,
    roastDate: result.roast_date ?? null,
    roasterName: selectedRoaster?.name ?? result.roaster_id ?? "Unknown Roaster",
  };
}

export default function MyBeansPage() {
  const { userBeans, fetchBeans, addBean, deleteBean, restockBean, isLoading } = useBeansStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [restockingBeanId, setRestockingBeanId] = useState<string | null>(null);
  const [restockValue, setRestockValue] = useState<string>("");
  const [catalogRoasters, setCatalogRoasters] = useState<string[]>([]);
  const [selectedRoaster, setSelectedRoaster] = useState<RoasterChoice | null>(null);
  const [selectedBean, setSelectedBean] = useState<BeanChoice | null>(null);
  const [beanResults, setBeanResults] = useState<BeanChoice[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [deletingBeanId, setDeletingBeanId] = useState<string | null>(null);
  const [roasterSearchQuery, setRoasterSearchQuery] = useState("");
  const [roasterSearchResults, setRoasterSearchResults] = useState<RoasterChoice[]>([]);
  const [beanSearchQuery, setBeanSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [roasterSelectionError, setRoasterSelectionError] = useState<string | null>(null);
  const [beanSelectionError, setBeanSelectionError] = useState<string | null>(null);
  const [roasterDuplicate, setRoasterDuplicate] = useState<DuplicateState<RoasterChoice> | null>(null);
  const [beanDuplicate, setBeanDuplicate] = useState<DuplicateState<BeanChoice> | null>(null);
  const [beanInlineFormOpen, setBeanInlineFormOpen] = useState(false);
  const [beanDraftName, setBeanDraftName] = useState("");
  const [beanDraftWholeOrGround, setBeanDraftWholeOrGround] = useState<"whole" | "ground">("whole");
  const [beanDraftRoastProfile, setBeanDraftRoastProfile] = useState<RoastProfile | null>(null);
  const [beanDraftRoastDate, setBeanDraftRoastDate] = useState("");
  const [isSubmittingBeanDraft, setIsSubmittingBeanDraft] = useState(false);
  const [isSubmittingRoaster, setIsSubmittingRoaster] = useState(false);

  const form = useForm<AddBeanFormValues>({
    resolver: zodResolver(addBeanSchema),
    defaultValues: { roastDate: "", isPreGround: false, bagWeightGrams: undefined },
  });

  const isPreGround = form.watch("isPreGround");

  useEffect(() => { fetchBeans(); }, [fetchBeans]);

  useEffect(() => {
    getCatalogRoasters()
      .then(setCatalogRoasters)
      .catch(() => setCatalogRoasters([]));
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    const trimmed = roasterSearchQuery.trim();
    if (!trimmed) {
      setRoasterSearchResults([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      searchRoastersApi(trimmed)
        .then((results) => setRoasterSearchResults(results.map(mapRoasterResult)))
        .catch(() => setRoasterSearchResults([]));
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [roasterSearchQuery]);

  useEffect(() => {
    if (!selectedRoaster) {
      setBeanResults([]);
      return;
    }

    const trimmed = beanSearchQuery.trim();
    if (!trimmed) {
      if (selectedRoaster.source === "catalog") {
        setCatalogLoading(true);
        getCatalogBeansByRoaster(selectedRoaster.name)
          .then((beans) =>
            setBeanResults(
              beans.map((bean) => ({
                id: bean.coffee_id,
                name: bean.name,
                source: "catalog",
                status: null,
                roasterId: selectedRoaster.name,
                submittedRoasterId: null,
                wholeOrGround: null,
                roastProfile: null,
                roastDate: null,
                roasterName: selectedRoaster.name,
              })),
            ),
          )
          .catch(() => setBeanResults([]))
          .finally(() => setCatalogLoading(false));
      } else {
        setBeanResults([]);
      }
      return;
    }

    const timeout = window.setTimeout(() => {
      setCatalogLoading(true);
      searchBeansApi({
        query: trimmed,
        roaster_id: selectedRoaster.source === "catalog" ? selectedRoaster.name : null,
        submitted_roaster_id: selectedRoaster.source === "submitted" ? selectedRoaster.id : null,
      })
        .then((results) => setBeanResults(results.map((result) => mapBeanResult(result, selectedRoaster))))
        .catch(() => setBeanResults([]))
        .finally(() => setCatalogLoading(false));
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [beanSearchQuery, selectedRoaster]);

  const roasterChoices = useMemo(() => {
    const baseCatalogChoices = catalogRoasters.map((name) => ({
      id: null,
      name,
      source: "catalog" as const,
      status: null,
    }));
    return dedupeRoasters([
      ...(selectedRoaster ? [selectedRoaster] : []),
      ...(roasterSearchQuery.trim() ? roasterSearchResults : baseCatalogChoices),
    ]);
  }, [catalogRoasters, roasterSearchQuery, roasterSearchResults, selectedRoaster]);

  const roasterOptionMap = useMemo(
    () => new Map(roasterChoices.map((choice) => [roasterValue(choice), choice])),
    [roasterChoices],
  );

  const roasterOptions = useMemo(
    () => roasterChoices.map((choice) => ({ label: choice.name, value: roasterValue(choice) })),
    [roasterChoices],
  );

  const beanChoices = useMemo(
    () => dedupeBeans([...(selectedBean ? [selectedBean] : []), ...beanResults]),
    [beanResults, selectedBean],
  );

  const beanOptionMap = useMemo(
    () => new Map(beanChoices.map((choice) => [beanValue(choice), choice])),
    [beanChoices],
  );

  const beanOptions = useMemo(
    () => beanChoices.map((choice) => ({ label: choice.name, value: beanValue(choice) })),
    [beanChoices],
  );

  async function handleRoasterSubmit(query: string, close: () => void, force = false) {
    const name = query.trim();
    if (name.length < 2 || isSubmittingRoaster) return;

    setIsSubmittingRoaster(true);
    try {
      const submitted = await submitRoasterApi({ name, force });
      const choice: RoasterChoice = {
        id: submitted.id,
        name: submitted.name,
        source: "submitted",
        status: submitted.status,
      };
      setSelectedRoaster(choice);
      setSelectedBean(null);
      setBeanResults([]);
      setBeanSearchQuery("");
      setRoasterSelectionError(null);
      setRoasterDuplicate(null);
      close();
      setToastMessage("Roaster submitted for review — your beans will be visible to you now");
    } catch (error) {
      if (error instanceof ApiConflictError) {
        const matches = ((error.data as { matches?: RoasterSearchResultApi[] }).matches ?? []).map(mapRoasterResult);
        setRoasterDuplicate({ query: name, matches });
      }
    } finally {
      setIsSubmittingRoaster(false);
    }
  }

  function openBeanInlineForm(query: string) {
    setBeanDraftName(query.trim());
    setBeanDraftWholeOrGround("whole");
    setBeanDraftRoastProfile(null);
    setBeanDraftRoastDate("");
    setBeanDuplicate(null);
    setBeanInlineFormOpen(true);
  }

  async function handleBeanDraftSubmit(close: () => void, force = false) {
    if (!selectedRoaster || isSubmittingBeanDraft) return;
    const name = beanDraftName.trim();
    if (name.length < 2) return;

    setIsSubmittingBeanDraft(true);
    try {
      const submitted = await submitBeanApi({
        name,
        whole_or_ground: beanDraftWholeOrGround,
        roast_profile: beanDraftRoastProfile,
        roast_date: beanDraftRoastDate || null,
        roaster_id: selectedRoaster.source === "catalog" ? selectedRoaster.name : null,
        submitted_roaster_id: selectedRoaster.source === "submitted" ? selectedRoaster.id : null,
        force,
      });

      const choice = mapBeanResult(submitted, selectedRoaster);
      setSelectedBean(choice);
      setBeanResults((prev) => dedupeBeans([choice, ...prev]));
      setBeanSelectionError(null);
      setBeanInlineFormOpen(false);
      setBeanDuplicate(null);
      form.setValue("isPreGround", submitted.whole_or_ground === "ground", { shouldValidate: true });
      if (submitted.roast_date) {
        form.setValue("roastDate", submitted.roast_date, { shouldValidate: true });
      }
      close();
      setToastMessage("Bean submitted for review — it's been added to your log");
    } catch (error) {
      if (error instanceof ApiConflictError) {
        const matches = ((error.data as { matches?: BeanSearchResultApi[] }).matches ?? []).map((match) =>
          mapBeanResult(match, selectedRoaster),
        );
        setBeanDuplicate({ query: name, matches });
      }
    } finally {
      setIsSubmittingBeanDraft(false);
    }
  }

  async function onSubmit(values: AddBeanFormValues) {
    if (!selectedRoaster) {
      setRoasterSelectionError("Roaster is required");
      return;
    }
    if (!selectedBean) {
      setBeanSelectionError("Bean name is required");
      return;
    }
    try {
      await addBean({
        coffee_id: selectedBean.source === "catalog" ? selectedBean.id : null,
        submitted_bean_id: selectedBean.source === "submitted" ? selectedBean.id : null,
        roast_date: values.roastDate?.trim() ? values.roastDate : null,
        is_pre_ground: values.isPreGround,
        bag_weight_grams: values.bagWeightGrams,
      });
      form.reset({ roastDate: "", isPreGround: false, bagWeightGrams: undefined });
      setSelectedRoaster(null);
      setSelectedBean(null);
      setBeanResults([]);
      setRoasterSearchQuery("");
      setBeanSearchQuery("");
      setRoasterDuplicate(null);
      setBeanDuplicate(null);
      setBeanInlineFormOpen(false);
      setRoasterSelectionError(null);
      setBeanSelectionError(null);
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
          const isSubmittedBean = bean.source === "submitted" || Boolean(bean.submittedBeanId);

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
                ) : isSubmittedBean ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PlaceholderBeanIcon className="h-16 w-16" />
                  </div>
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
                  {isSubmittedBean && bean.status === "pending" && (
                    <p className="mt-1 text-[11px] text-slate-500">Pending review</p>
                  )}
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
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-background-dark/80 backdrop-blur-sm px-4 pt-4 pb-24">
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
                value={selectedRoaster ? roasterValue(selectedRoaster) : ""}
                onChange={(value) => {
                  const choice = roasterOptionMap.get(value);
                  if (!choice) return;
                  setSelectedRoaster(choice);
                  setSelectedBean(null);
                  setBeanResults([]);
                  setBeanSearchQuery("");
                  setRoasterSelectionError(null);
                }}
                options={roasterOptions}
                onQueryChange={setRoasterSearchQuery}
                renderTopContent={({ query, close }) => (
                  <div className="flex flex-col gap-2">
                    {query.length >= 2 && (
                      <button
                        type="button"
                        onClick={() => handleRoasterSubmit(query, close, roasterDuplicate?.query === query)}
                        className="flex w-full items-center justify-between rounded-xl border border-primary/20 bg-primary/8 px-3 py-2.5 text-left text-sm text-primary hover:bg-primary/12 transition-colors"
                      >
                        <span>+ Add &quot;{query}&quot; as a new roaster</span>
                        {isSubmittingRoaster && <span className="text-xs text-primary/70">Saving…</span>}
                      </button>
                    )}

                    {roasterDuplicate?.query === query && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                        <p className="text-xs font-semibold text-amber-300">Did you mean one of these?</p>
                        <div className="mt-2 flex flex-col gap-2">
                          {roasterDuplicate.matches.map((match) => (
                            <button
                              key={`${match.source}:${match.id ?? match.name}`}
                              type="button"
                              onClick={() => {
                                setSelectedRoaster(match);
                                setSelectedBean(null);
                                setBeanResults([]);
                                setBeanSearchQuery("");
                                setRoasterDuplicate(null);
                                setRoasterSelectionError(null);
                                close();
                              }}
                              className="rounded-lg bg-[#00000020] px-3 py-2 text-left text-xs text-slate-100 hover:bg-[#00000030] transition-colors"
                            >
                              {match.name}
                              {match.source === "submitted" && match.status ? ` · ${match.status}` : ""}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setRoasterDuplicate(null);
                            void handleRoasterSubmit(query, close, true);
                          }}
                          className="mt-3 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors"
                        >
                          Submit anyway
                        </button>
                      </div>
                    )}
                  </div>
                )}
              />
              {roasterSelectionError && (
                <p className="text-xs text-red-400">{roasterSelectionError}</p>
              )}
            </div>

            {/* Bean variety */}
            <div className="flex flex-col gap-2">
              <p className="text-primary text-xs font-bold uppercase tracking-wider">Select Bean Variety</p>
              <SearchableCombobox
                label=""
                placeholder={selectedRoaster ? "Select a bean" : "Pick roaster first"}
                searchPlaceholder="Search beans…"
                value={selectedBean ? beanValue(selectedBean) : ""}
                onChange={(value) => {
                  const choice = beanOptionMap.get(value);
                  if (!choice) return;
                  setSelectedBean(choice);
                  setBeanSelectionError(null);
                  if (choice.source === "submitted" && choice.wholeOrGround) {
                    form.setValue("isPreGround", choice.wholeOrGround === "ground", { shouldValidate: true });
                  }
                  if (choice.roastDate) {
                    form.setValue("roastDate", choice.roastDate, { shouldValidate: true });
                  }
                }}
                options={beanOptions}
                disabled={!selectedRoaster || catalogLoading}
                onQueryChange={setBeanSearchQuery}
                renderTopContent={({ query, close }) => (
                  <div className="flex flex-col gap-2">
                    {query.length >= 2 && !beanInlineFormOpen && (
                      <button
                        type="button"
                        onClick={() => openBeanInlineForm(query)}
                        className="flex w-full items-center justify-between rounded-xl border border-primary/20 bg-primary/8 px-3 py-2.5 text-left text-sm text-primary hover:bg-primary/12 transition-colors"
                      >
                        <span>+ Add &quot;{query}&quot; as a new bean</span>
                      </button>
                    )}

                    {beanInlineFormOpen && (
                      <div className="rounded-xl border border-primary/20 bg-primary/8 p-3">
                        <div className="flex flex-col gap-3">
                          <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-primary/80">Bean name</p>
                            <input
                              type="text"
                              value={beanDraftName}
                              onChange={(e) => setBeanDraftName(e.target.value)}
                              className="h-11 w-full rounded-xl border border-primary/20 bg-primary/5 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary/40"
                            />
                          </div>

                          <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-primary/80">Whole / Ground</p>
                            <div className="flex h-11 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setBeanDraftWholeOrGround("whole")}
                                className={`flex-1 px-4 text-sm font-bold transition-colors ${
                                  beanDraftWholeOrGround === "whole"
                                    ? "bg-primary/20 text-primary"
                                    : "text-slate-500 hover:text-slate-300"
                                }`}
                              >
                                WHOLE
                              </button>
                              <div className="w-px bg-primary/20" />
                              <button
                                type="button"
                                onClick={() => setBeanDraftWholeOrGround("ground")}
                                className={`flex-1 px-4 text-sm font-bold transition-colors ${
                                  beanDraftWholeOrGround === "ground"
                                    ? "bg-primary text-background-dark"
                                    : "text-slate-500 hover:text-slate-300"
                                }`}
                              >
                                GROUND
                              </button>
                            </div>
                          </div>

                          <div>
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary/80">Roast profile</p>
                            <div className="flex flex-wrap gap-2">
                              {ROAST_PROFILES.map((profile) => (
                                <button
                                  key={profile}
                                  type="button"
                                  onClick={() => setBeanDraftRoastProfile((current) => current === profile ? null : profile)}
                                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    beanDraftRoastProfile === profile
                                      ? "border-primary bg-primary text-background-dark"
                                      : "border-primary/20 bg-primary/5 text-slate-300"
                                  }`}
                                >
                                  {profile}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-primary/80">Roast date</p>
                            <input
                              type="date"
                              max={new Date().toISOString().split("T")[0]}
                              value={beanDraftRoastDate}
                              onChange={(e) => setBeanDraftRoastDate(e.target.value)}
                              className="h-11 w-full rounded-xl border border-primary/20 bg-primary/5 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary/40 [color-scheme:dark]"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleBeanDraftSubmit(close, beanDuplicate?.query === beanDraftName.trim())}
                              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-background-dark disabled:opacity-50"
                              disabled={isSubmittingBeanDraft || beanDraftName.trim().length < 2}
                            >
                              {isSubmittingBeanDraft ? "Submitting…" : "Submit bean"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBeanInlineFormOpen(false);
                                setBeanDuplicate(null);
                              }}
                              className="rounded-xl border border-slate-600 px-4 py-3 text-sm text-slate-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {beanDuplicate?.query === beanDraftName.trim() && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                        <p className="text-xs font-semibold text-amber-300">Did you mean one of these?</p>
                        <div className="mt-2 flex flex-col gap-2">
                          {beanDuplicate.matches.map((match) => (
                            <button
                              key={`${match.source}:${match.id}`}
                              type="button"
                              onClick={() => {
                                setSelectedBean(match);
                                setBeanInlineFormOpen(false);
                                setBeanDuplicate(null);
                                setBeanSelectionError(null);
                                close();
                              }}
                              className="rounded-lg bg-[#00000020] px-3 py-2 text-left text-xs text-slate-100 hover:bg-[#00000030] transition-colors"
                            >
                              {match.name}
                              {match.source === "submitted" && match.status ? ` · ${match.status}` : ""}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleBeanDraftSubmit(close, true)}
                          className="mt-3 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors"
                        >
                          Submit anyway
                        </button>
                      </div>
                    )}
                  </div>
                )}
              />
              {beanSelectionError && (
                <p className="text-xs text-red-400">{beanSelectionError}</p>
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

      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-primary/20 bg-[#2a1d11] px-4 py-3 text-center shadow-2xl">
          <p className="text-sm text-slate-200">{toastMessage}</p>
        </div>
      )}
    </main>
  );
}
