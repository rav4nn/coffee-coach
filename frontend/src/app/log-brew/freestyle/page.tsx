"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CompactFlowHeader } from "@/components/CompactFlowHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBrewHistoryStore, type FreestyleBrewEntry, type CoachingChange } from "@/lib/brewHistoryStore";
import { useBeansStore } from "@/lib/beansStore";
import { useLogBrewStore } from "@/lib/logBrewStore";

const grindSizeOptions = ["Extra Fine", "Fine", "Medium-Fine", "Medium", "Medium-Coarse", "Coarse"] as const;

function shiftGrind(current: string, direction: "finer" | "coarser"): string {
  const idx = grindSizeOptions.indexOf(current as typeof grindSizeOptions[number]);
  if (idx === -1) return current;
  const newIdx = direction === "finer" ? Math.max(0, idx - 1) : Math.min(grindSizeOptions.length - 1, idx + 1);
  return grindSizeOptions[newIdx];
}

function CoachHint({ change, originalValue }: { change: CoachingChange; originalValue?: string }) {
  const hasComputedValues = change.previousValue != null && change.newValue != null;
  const isClicksGrind = change.param === "grindSize" && typeof change.previousValue === "number";

  return (
    <div className="flex items-start gap-1.5 mt-1 px-2 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
      <Image
        src="/coach/img3_whistle_blowing.png"
        alt="Coach"
        width={16}
        height={16}
        className="w-4 h-4 object-contain shrink-0 mt-0.5"
      />
      <p className="text-xs text-primary leading-relaxed">
        <span className="font-normal">Coach says:</span>{" "}
        {hasComputedValues ? (
          <>
            <span className="line-through text-primary/50">{change.previousValue}{isClicksGrind ? " clicks" : ""}</span>
            <span className="font-normal"> → {change.newValue}{isClicksGrind ? " clicks" : ""}</span>
          </>
        ) : (
          <>
            {change.suggestion}
            {originalValue && <span className="text-primary/60"> (was {originalValue})</span>}
          </>
        )}
      </p>
    </div>
  );
}


const freestyleSchema = z.object({
  coffeeGrams: z.coerce.number().positive("Enter coffee amount"),
  waterMl: z.coerce.number().positive("Enter water amount"),
  waterTempC: z.coerce.number().positive("Enter water temperature").optional(),
  grindSize: z.enum(grindSizeOptions),
  grinderClicks: z.coerce.number().int().positive("Enter click count").optional(),
  brewTime: z
    .string()
    .min(1, "Enter brew time")
    .regex(/^\d+:[0-5]\d$/, "Invalid time — use mm:ss format (e.g. 01:40)"),
  notes: z.string().optional(),
});

type FreestyleForm = z.infer<typeof freestyleSchema>;

export default function FreestyleLogPage() {
  const router = useRouter();
  const addEntry = useBrewHistoryStore((state) => state.addEntry);
  const brewEntries = useBrewHistoryStore((state) => state.entries);
  const selectedBeanId = useLogBrewStore((state) => state.selectedBeanId);
  const selectedMethodId = useLogBrewStore((state) => state.selectedMethodId);
  const selectedPourOverDeviceId = useLogBrewStore((state) => state.selectedPourOverDeviceId);
  const userBeans = useBeansStore((state) => state.userBeans);
  const selectedBean = userBeans.find((b) => b.id === selectedBeanId);
  const effectiveMethodLabel = (() => {
    const key = selectedMethodId === "pour_over" ? (selectedPourOverDeviceId ?? selectedMethodId) : selectedMethodId;
    if (!key) return null;
    const map: Record<string, string> = {
      v60: "V60", chemex: "Chemex", kalita_wave: "Kalita Wave", clever_dripper: "Clever Dripper",
      hario_switch: "Hario Switch", wilfa_pour_over: "Wilfa Pour Over", origami_dripper: "Origami Dripper",
      aeropress: "AeroPress", french_press: "French Press", moka_pot: "Moka Pot",
      cold_brew: "Cold Brew", south_indian_filter: "Filter Kaapi",
    };
    return map[key] ?? key.replace(/_/g, " ");
  })();
  const coachBrewRef = useLogBrewStore((state) => state.coachBrewRef);
  const coachChanges = useLogBrewStore((state) => state.coachChanges);
  const clearCoachMode = useLogBrewStore((state) => state.clearCoachMode);

  const isCoachMode = !!coachBrewRef && coachChanges !== null;

  // Grinder state — auto-detect from user profile
  const [userGrinderName, setUserGrinderName] = useState<string | null>(null);
  const [useClicks, setUseClicks] = useState(false);

  useEffect(() => {
    fetch("/api/users/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((user) => {
        if (user.grinder_name) {
          setUserGrinderName(user.grinder_name as string);
          setUseClicks(true);
        }
      })
      .catch(() => {});
  }, []);

  const effectiveMethodId = useMemo(() => {
    if (selectedMethodId === "pour_over") {
      return selectedPourOverDeviceId ?? selectedMethodId;
    }
    return selectedMethodId;
  }, [selectedMethodId, selectedPourOverDeviceId]);

  const isColdBrew = effectiveMethodId === "cold_brew";

  // Build coach-adjusted defaults
  const coachDefaults = useMemo(() => {
    if (!isCoachMode || !coachBrewRef) return null;
    const defaults: FreestyleForm = {
      coffeeGrams: coachBrewRef.coffeeGrams,
      waterMl: coachBrewRef.waterMl,
      waterTempC: coachBrewRef.waterTempC ?? undefined,
      grindSize: coachBrewRef.grindSize,
      grinderClicks: coachBrewRef.grinderClicks ?? undefined,
      brewTime: coachBrewRef.brewTime,
      notes: "",
    };

    for (const change of coachChanges!) {
      if (change.newValue != null) {
        if (change.param === "coffeeGrams") defaults.coffeeGrams = change.newValue as number;
        if (change.param === "waterTempC") defaults.waterTempC = change.newValue as number;
        if (change.param === "grindSize") {
          if (typeof change.newValue === "number") {
            // Clicks-based grind: update click count, not grind size label
            defaults.grinderClicks = change.newValue;
          } else {
            defaults.grindSize = change.newValue as typeof defaults.grindSize;
          }
        }
        if (change.param === "brewTime") defaults.brewTime = change.newValue as string;
      } else if (change.param === "grindSize" && (change.direction === "finer" || change.direction === "coarser")) {
        defaults.grindSize = shiftGrind(defaults.grindSize, change.direction) as typeof defaults.grindSize;
      }
    }

    return defaults;
  }, [isCoachMode, coachBrewRef, coachChanges]);

  const coachChangeMap = useMemo(() => {
    if (!coachChanges) return new Map<string, CoachingChange>();
    const map = new Map<string, CoachingChange>();
    for (const c of coachChanges) {
      map.set(c.param, c);
    }
    return map;
  }, [coachChanges]);

  const lastGrindForBean = useMemo(() => {
    if (isCoachMode) return null;
    if (!selectedBeanId) return null;
    const sorted = [...brewEntries]
      .filter((e): e is FreestyleBrewEntry & { grindSize: NonNullable<FreestyleBrewEntry["grindSize"]> } =>
        e.beanId === selectedBeanId && Boolean(e.grindSize)
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted[0]?.grindSize ?? null;
  }, [brewEntries, selectedBeanId, isCoachMode]);

  const form = useForm<FreestyleForm>({
    resolver: zodResolver(freestyleSchema),
    defaultValues: coachDefaults ?? {
      coffeeGrams: undefined,
      waterMl: undefined,
      waterTempC: undefined,
      grindSize: "Medium",
      brewTime: "",
      notes: "",
    },
  });

  const { setValue } = form;
  const [grindPreFilled, setGrindPreFilled] = useState(false);
  useEffect(() => {
    if (!isCoachMode && lastGrindForBean) {
      setValue("grindSize", lastGrindForBean, { shouldValidate: false });
      setGrindPreFilled(true);
    }
  }, [lastGrindForBean, setValue, isCoachMode]);

  // Brew time — local display value for auto-formatting
  const [brewTimeDisplay, setBrewTimeDisplay] = useState(coachDefaults?.brewTime ?? "");

  const [tastingNotes, setTastingNotes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const errors = form.formState.errors;

  function handleBrewTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setBrewTimeDisplay(val);
    form.setValue("brewTime", val, { shouldValidate: true });
  }

  async function onSubmit(values: FreestyleForm) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      let coachFollowed: boolean | null = null;
      let coachSourceBrewId: string | null = null;
      if (isCoachMode && coachBrewRef && coachChanges) {
        coachSourceBrewId = coachBrewRef.id;
        coachFollowed = true;
        for (const change of coachChanges) {
          if (change.newValue == null) continue;
          if (change.param === "grindSize" && values.grindSize !== change.newValue) {
            coachFollowed = false;
          }
          if (change.param === "coffeeGrams" && Math.abs(values.coffeeGrams - (change.newValue as number)) > (change.newValue as number) * 0.1) {
            coachFollowed = false;
          }
          if (change.param === "waterTempC" && values.waterTempC != null && Math.abs(values.waterTempC - (change.newValue as number)) > (change.newValue as number) * 0.1) {
            coachFollowed = false;
          }
        }
      }

      await addEntry({
        beanId: selectedBeanId,
        methodId: effectiveMethodId,
        coffeeGrams: values.coffeeGrams,
        waterMl: values.waterMl,
        waterTempC: isColdBrew ? null : (values.waterTempC ?? null),
        grindSize: useClicks ? "Medium" as const : values.grindSize,
        grinderName: useClicks && userGrinderName ? userGrinderName : null,
        grinderClicks: useClicks && values.grinderClicks ? values.grinderClicks : null,
        brewTime: values.brewTime,
        notes: values.notes?.trim() ? values.notes.trim() : null,
        tastingNotes: tastingNotes.length > 0 ? tastingNotes : null,
        coachSourceBrewId,
        coachFollowed,
      });
      clearCoachMode();
      const newId = useBrewHistoryStore.getState().entries[0]?.id ?? "";
      router.push(`/log-brew/freestyle/success?brew_id=${newId}`);
    } catch {
      setSubmitError("Failed to save brew. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="overflow-y-auto pb-28">
      <CompactFlowHeader
        title="Log Your Brew"
        onBack={() => router.back()}
      />

      {/* Context bar */}
      {selectedBean && effectiveMethodLabel && (
        <p className="mb-3 mt-2 px-4 text-center text-xs text-[#ffffff60]">
          {selectedBean.beanName} <span className="text-[#ffffff60]">·</span> {effectiveMethodLabel}
        </p>
      )}

      {isCoachMode && (
        <div className="px-4 pb-1">
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <Image
              src="/coach/img3_whistle_blowing.png"
              alt="Coach"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 object-contain"
            />
            <p className="text-xs leading-relaxed text-slate-300">
              Coach&apos;s adjustments are pre-filled from your last brew so you can log the updated version quickly.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4 pt-2">
        {/* ── Brewing Essentials ──────────────────────────────────── */}
        <div className="rounded-2xl border border-primary/10 bg-steam p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-lg">coffee_maker</span>
            <h2 className="text-xs font-normal uppercase tracking-widest text-slate-400">Brewing Essentials</h2>
          </div>

          {/* Row 1: Coffee + Water */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="coffee-grams" className="mb-1 block text-[11px] font-normal uppercase tracking-wider text-slate-500">
                Coffee (g)
              </label>
              <Input id="coffee-grams" type="number" step="0.1" {...form.register("coffeeGrams")} />
              {errors.coffeeGrams ? <p className="text-xs text-red-700 mt-0.5">{errors.coffeeGrams.message}</p> : null}
              {coachChangeMap.has("coffeeGrams") && (
                <CoachHint
                  change={coachChangeMap.get("coffeeGrams")!}
                  originalValue={coachBrewRef ? `${coachBrewRef.coffeeGrams}g` : undefined}
                />
              )}
            </div>
            <div>
              <label htmlFor="water-ml" className="mb-1 block text-[11px] font-normal uppercase tracking-wider text-slate-500">
                Water (ml)
              </label>
              <Input id="water-ml" type="number" step="1" {...form.register("waterMl")} />
              {errors.waterMl ? <p className="text-xs text-red-700 mt-0.5">{errors.waterMl.message}</p> : null}
            </div>
          </div>

          {/* Row 2: Water Temp + Brew Time */}
          <div className={`grid gap-3 ${isColdBrew ? "grid-cols-1" : "grid-cols-2"}`}>
            {!isColdBrew && (
              <div>
                <label htmlFor="water-temp" className="mb-1 block text-[11px] font-normal uppercase tracking-wider text-slate-500">
                  Temp (°C)
                </label>
                <Input id="water-temp" type="number" step="1" {...form.register("waterTempC")} />
                {errors.waterTempC ? <p className="text-xs text-red-700 mt-0.5">{errors.waterTempC.message}</p> : null}
                {coachChangeMap.has("waterTempC") && (
                  <CoachHint
                    change={coachChangeMap.get("waterTempC")!}
                    originalValue={coachBrewRef?.waterTempC ? `${coachBrewRef.waterTempC}°C` : undefined}
                  />
                )}
              </div>
            )}
            <div>
              <label htmlFor="brew-time" className="mb-1 block text-[11px] font-normal uppercase tracking-wider text-slate-500">
                {isColdBrew ? "Brew Time (h:mm)" : "Brew Time"}
              </label>
              <Input
                id="brew-time"
                type="text"
                inputMode="numeric"
                placeholder={isColdBrew ? "h:mm" : "mm:ss"}
                value={brewTimeDisplay}
                onChange={handleBrewTimeChange}
              />
              {errors.brewTime ? <p className="text-xs text-red-700 mt-0.5">{errors.brewTime.message}</p> : null}
              {coachChangeMap.has("brewTime") && (
                <CoachHint
                  change={coachChangeMap.get("brewTime")!}
                  originalValue={coachBrewRef?.brewTime}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Grind Setting ──────────────────────────────────────── */}
        <div className="rounded-2xl border border-primary/10 bg-steam p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">tune</span>
              <h2 className="text-xs font-normal uppercase tracking-widest text-slate-400">Grind Setting</h2>
            </div>
            {userGrinderName && (
              <button
                type="button"
                onClick={() => setUseClicks((v) => !v)}
                className="text-[10px] font-normal uppercase tracking-wider text-primary/70 transition-colors hover:text-primary"
              >
                {useClicks ? "Use grind size" : "Use clicks"}
              </button>
            )}
          </div>

          {useClicks && userGrinderName ? (
            <div>
              <label htmlFor="grinder-clicks" className="mb-1 block text-[11px] font-normal uppercase tracking-wider text-slate-500">
                Clicks on {userGrinderName}
              </label>
              <Input
                id="grinder-clicks"
                type="number"
                step="1"
                min="1"
                placeholder="e.g. 24"
                {...form.register("grinderClicks")}
              />
              {errors.grinderClicks ? <p className="text-xs text-red-700 mt-0.5">{errors.grinderClicks.message}</p> : null}
            </div>
          ) : (
            <div>
              <label htmlFor="grind-size" className="mb-1 block text-[11px] font-normal uppercase tracking-wider text-slate-500">
                Grind Size
              </label>
              <select
                id="grind-size"
                {...form.register("grindSize")}
                className="h-10 w-full rounded-xl border border-mocha/20 bg-steam px-3 text-sm text-espresso outline-none focus:ring-2 focus:ring-mocha/40"
              >
                {grindSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.grindSize ? <p className="text-xs text-red-700 mt-0.5">{errors.grindSize.message}</p> : null}
              {grindPreFilled && !errors.grindSize && (
                <p className="text-xs text-mocha/60 flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>history</span>
                  Pre-filled from your last brew with this bean
                </p>
              )}
            </div>
          )}
          {coachChangeMap.has("grindSize") && (
            <CoachHint
              change={coachChangeMap.get("grindSize")!}
              originalValue={coachBrewRef?.grindSize}
            />
          )}
        </div>

        {/* ── Notes ──────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-primary/10 bg-steam p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
            <h2 className="text-xs font-normal uppercase tracking-widest text-slate-400">Notes</h2>
          </div>
          <textarea
            id="notes"
            rows={3}
            {...form.register("notes")}
            className="w-full rounded-xl border border-mocha/20 bg-steam px-3 py-2 text-sm text-espresso outline-none focus:ring-2 focus:ring-mocha/40"
            placeholder="Any quick observations about this brew..."
          />
        </div>

        {submitError ? <p className="text-xs text-red-400 text-center">{submitError}</p> : null}
        {!submitError && form.formState.isSubmitted && !form.formState.isValid && (
          <p className="text-xs text-red-400 text-center">Please fill in all required fields above.</p>
        )}

        <Button type="submit" disabled={submitting} className="h-12 w-full text-base font-normal">
          {submitting ? "Saving…" : "Log Brew"}
        </Button>
      </form>
    </main>
  );
}
