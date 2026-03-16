"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/** Auto-format a brew time input: as user types digits, format as mm:ss */
function formatBrewTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}`;
}

function isValidBrewTime(val: string): boolean {
  return /^\d{1,2}:\d{2}$/.test(val);
}

function normalizeBrewTime(val: string): string {
  const match = val.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "00:00";
  const mins = parseInt(match[1], 10);
  const secs = Math.min(59, parseInt(match[2], 10));
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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

    for (const change of coachChanges!) {
      if (change.newValue != null) {
        if (change.param === "coffeeGrams") defaults.coffeeGrams = change.newValue as number;
        if (change.param === "waterTempC") defaults.waterTempC = change.newValue as number;
        if (change.param === "grindSize") defaults.grindSize = change.newValue as typeof defaults.grindSize;
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

  // Brew time — local display value for auto-formatting
  const [brewTimeDisplay, setBrewTimeDisplay] = useState(form.getValues("brewTime") ?? "00:00");

  const [tastingNotes, setTastingNotes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const errors = form.formState.errors;

  function handleBrewTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatBrewTimeInput(e.target.value);
    setBrewTimeDisplay(formatted);
    if (isValidBrewTime(formatted)) {
      const normalized = normalizeBrewTime(formatted);
      form.setValue("brewTime", normalized, { shouldValidate: true });
    }
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

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* ── Brewing Essentials ──────────────────────────────────── */}
        <div className="rounded-2xl border border-primary/10 bg-steam p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-lg">coffee_maker</span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Brewing Essentials</h2>
          </div>

          {/* Row 1: Coffee + Water */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="coffee-grams" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
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
              <label htmlFor="water-ml" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
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
                <label htmlFor="water-temp" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
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
              <label htmlFor="brew-time" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Brew Time
              </label>
              <Input
                id="brew-time"
                type="text"
                inputMode="numeric"
                placeholder="mm:ss"
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Grind Setting</h2>
            </div>
            {userGrinderName && (
              <button
                type="button"
                onClick={() => setUseClicks((v) => !v)}
                className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 hover:text-primary transition-colors"
              >
                {useClicks ? "Use grind size" : "Use clicks"}
              </button>
            )}
          </div>

          {useClicks && userGrinderName ? (
            <div>
              <label htmlFor="grinder-clicks" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
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
              <label htmlFor="grind-size" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
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

        {/* ── Tasting Notes ──────────────────────────────────────── */}
        <div className="rounded-2xl border border-primary/10 bg-steam p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-lg">restaurant</span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">How did it taste?</h2>
          </div>
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

        {/* ── Notes ──────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-primary/10 bg-steam p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Notes</h2>
          </div>
          <textarea
            id="notes"
            rows={3}
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
