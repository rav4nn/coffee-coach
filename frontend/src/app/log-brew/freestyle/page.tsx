"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrewTimePicker } from "@/components/BrewTimePicker";
import { useBrewHistoryStore, type FreestyleBrewEntry, type CoachingChange } from "@/lib/brewHistoryStore";
import { useLogBrewStore } from "@/lib/logBrewStore";

const grindSizeOptions = ["Extra Fine", "Fine", "Medium-Fine", "Medium", "Medium-Coarse", "Coarse"] as const;

function shiftGrind(current: string, direction: "finer" | "coarser"): string {
  const idx = grindSizeOptions.indexOf(current as typeof grindSizeOptions[number]);
  if (idx === -1) return current;
  const newIdx = direction === "finer" ? Math.max(0, idx - 1) : Math.min(grindSizeOptions.length - 1, idx + 1);
  return grindSizeOptions[newIdx];
}

function CoachHint({ change, originalValue }: { change: CoachingChange; originalValue?: string }) {
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
        <span className="font-semibold">Coach says:</span> {change.suggestion}
        {originalValue && <span className="text-primary/60"> (was {originalValue})</span>}
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
    .regex(/^\d{2}:\d{2}$/, "Use mm:ss format"),
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
      brewTime: coachBrewRef.brewTime,
      notes: "",
    };

    // Apply computed values from coach, with grind shift as fallback
    for (const change of coachChanges!) {
      if (change.newValue != null) {
        if (change.param === "coffeeGrams") defaults.coffeeGrams = change.newValue as number;
        if (change.param === "waterTempC") defaults.waterTempC = change.newValue as number;
        if (change.param === "grindSize") defaults.grindSize = change.newValue as typeof defaults.grindSize;
        if (change.param === "brewTime") defaults.brewTime = change.newValue as string;
      } else if (change.param === "grindSize" && (change.direction === "finer" || change.direction === "coarser")) {
        // Fallback for old coaching changes without computed values
        defaults.grindSize = shiftGrind(defaults.grindSize, change.direction) as typeof defaults.grindSize;
      }
    }

    return defaults;
  }, [isCoachMode, coachBrewRef, coachChanges]);

  // Build a map of which params have coach changes for easy lookup
  const coachChangeMap = useMemo(() => {
    if (!coachChanges) return new Map<string, CoachingChange>();
    const map = new Map<string, CoachingChange>();
    for (const c of coachChanges) {
      map.set(c.param, c);
    }
    return map;
  }, [coachChanges]);

  const lastGrindForBean = useMemo(() => {
    if (isCoachMode) return null; // Skip when in coach mode
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
      brewTime: "00:00",
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

  const [tastingNotes, setTastingNotes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const errors = form.formState.errors;

  async function onSubmit(values: FreestyleForm) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Compute coach adherence if in coach mode
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
    <section className="space-y-5">
      <div>
        {isCoachMode ? (
          <>
            <div className="flex items-center gap-2">
              <Image src="/coach/img3_whistle_blowing.png" alt="Coach" width={24} height={24} className="w-6 h-6 object-contain" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Follow the Coach</p>
            </div>
            <h1 className="font-serif text-4xl font-bold leading-tight text-espresso mt-1">Coach&apos;s Recipe</h1>
            <p className="mt-1 text-sm text-mocha/80">Your last brew&apos;s params with the coach&apos;s adjustments applied.</p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mocha/70">Freestyle Brew</p>
            <h1 className="font-serif text-4xl font-bold leading-tight text-espresso">Log Your Brew Parameters</h1>
            <p className="mt-1 text-sm text-mocha/80">Capture this brew so we can coach your next one.</p>
          </>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-3xl border border-mocha/10 bg-steam p-4 shadow-card">
        <div className="space-y-2">
          <Label htmlFor="coffee-grams">Coffee (g)</Label>
          <Input id="coffee-grams" type="number" step="0.1" {...form.register("coffeeGrams")} />
          {errors.coffeeGrams ? <p className="text-xs text-red-700">{errors.coffeeGrams.message}</p> : null}
          {coachChangeMap.has("coffeeGrams") && (
            <CoachHint
              change={coachChangeMap.get("coffeeGrams")!}
              originalValue={coachBrewRef ? `${coachBrewRef.coffeeGrams}g` : undefined}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="water-ml">Water (ml)</Label>
          <Input id="water-ml" type="number" step="1" {...form.register("waterMl")} />
          {errors.waterMl ? <p className="text-xs text-red-700">{errors.waterMl.message}</p> : null}
        </div>

        {!isColdBrew ? (
          <div className="space-y-2">
            <Label htmlFor="water-temp">Water Temperature (°C)</Label>
            <Input id="water-temp" type="number" step="1" {...form.register("waterTempC")} />
            {errors.waterTempC ? <p className="text-xs text-red-700">{errors.waterTempC.message}</p> : null}
            {coachChangeMap.has("waterTempC") && (
              <CoachHint
                change={coachChangeMap.get("waterTempC")!}
                originalValue={coachBrewRef?.waterTempC ? `${coachBrewRef.waterTempC}°C` : undefined}
              />
            )}
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="grind-size">Grind</Label>
            {userGrinderName && (
              <button
                type="button"
                onClick={() => setUseClicks((v) => !v)}
                className="text-[10px] font-semibold uppercase tracking-wider text-mocha/60 hover:text-mocha transition-colors"
              >
                {useClicks ? "Use grind size" : "Use clicks"}
              </button>
            )}
          </div>
          {useClicks && userGrinderName ? (
            <>
              <div className="flex items-center gap-2">
                <Input
                  id="grinder-clicks"
                  type="number"
                  step="1"
                  min="1"
                  placeholder="Clicks"
                  {...form.register("grinderClicks")}
                  className="flex-1"
                />
                <span className="text-xs text-mocha/60 shrink-0">on {userGrinderName}</span>
              </div>
              {errors.grinderClicks ? <p className="text-xs text-red-700">{errors.grinderClicks.message}</p> : null}
            </>
          ) : (
            <>
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
              {errors.grindSize ? <p className="text-xs text-red-700">{errors.grindSize.message}</p> : null}
              {grindPreFilled && !errors.grindSize && (
                <p className="text-xs text-mocha/60 flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>history</span>
                  Pre-filled from your last brew with this bean
                </p>
              )}
            </>
          )}
          {coachChangeMap.has("grindSize") && (
            <CoachHint
              change={coachChangeMap.get("grindSize")!}
              originalValue={coachBrewRef?.grindSize}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>Brew Time</Label>
          <BrewTimePicker
            value={form.watch("brewTime")}
            onChange={(v) => form.setValue("brewTime", v, { shouldValidate: true })}
          />
          {errors.brewTime ? <p className="text-xs text-red-700">{errors.brewTime.message}</p> : null}
          {coachChangeMap.has("brewTime") && (
            <CoachHint
              change={coachChangeMap.get("brewTime")!}
              originalValue={coachBrewRef?.brewTime}
            />
          )}
        </div>

        {/* Tasting notes */}
        <div className="space-y-2">
          <Label>How did it taste? (Optional)</Label>
          <div className="flex flex-wrap gap-2">
            {(["Sweet", "Sour", "Bitter", "Bright", "Flat", "Roasty", "Floral", "Fruity", "Nutty", "Chocolatey"] as const).map((chip) => {
              const selected = tastingNotes.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() =>
                    setTastingNotes((current) =>
                      current.includes(chip)
                        ? current.filter((c) => c !== chip)
                        : [...current, chip]
                    )
                  }
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    selected
                      ? "bg-mocha text-cream border-mocha"
                      : "bg-steam text-mocha border-mocha/20"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <textarea
            id="notes"
            rows={4}
            {...form.register("notes")}
            className="w-full rounded-xl border border-mocha/20 bg-steam px-3 py-2 text-sm text-espresso outline-none focus:ring-2 focus:ring-mocha/40"
            placeholder="Any quick observations about this brew..."
          />
        </div>

        {submitError ? <p className="text-xs text-red-700">{submitError}</p> : null}

        <Button type="submit" disabled={submitting} className="h-12 w-full text-base">
          {submitting ? "Saving…" : "Log Brew"}
        </Button>
      </form>
    </section>
  );
}
