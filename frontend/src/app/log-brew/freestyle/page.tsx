"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBrewHistoryStore } from "@/lib/brewHistoryStore";
import { useLogBrewStore } from "@/lib/logBrewStore";

const grindSizeOptions = ["Extra Fine", "Fine", "Medium-Fine", "Medium", "Medium-Coarse", "Coarse"] as const;

const freestyleSchema = z.object({
  coffeeGrams: z.coerce.number().positive("Enter coffee amount"),
  waterMl: z.coerce.number().positive("Enter water amount"),
  waterTempC: z.coerce.number().positive("Enter water temperature").optional(),
  grindSize: z.enum(grindSizeOptions),
  brewTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Use mm:ss format"),
  notes: z.string().optional(),
});

type FreestyleForm = z.infer<typeof freestyleSchema>;

export default function FreestyleLogPage() {
  const router = useRouter();
  const addEntry = useBrewHistoryStore((state) => state.addEntry);
  const selectedBeanId = useLogBrewStore((state) => state.selectedBeanId);
  const selectedMethodId = useLogBrewStore((state) => state.selectedMethodId);
  const selectedPourOverDeviceId = useLogBrewStore((state) => state.selectedPourOverDeviceId);

  const effectiveMethodId = useMemo(() => {
    if (selectedMethodId === "pour_over") {
      return selectedPourOverDeviceId ?? selectedMethodId;
    }
    return selectedMethodId;
  }, [selectedMethodId, selectedPourOverDeviceId]);

  const isColdBrew = effectiveMethodId === "cold_brew";

  const form = useForm<FreestyleForm>({
    resolver: zodResolver(freestyleSchema),
    defaultValues: {
      coffeeGrams: undefined,
      waterMl: undefined,
      waterTempC: undefined,
      grindSize: "Medium",
      brewTime: "00:00",
      notes: "",
    },
  });

  const [tastingNotes, setTastingNotes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const errors = form.formState.errors;

  async function onSubmit(values: FreestyleForm) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await addEntry({
        beanId: selectedBeanId,
        methodId: effectiveMethodId,
        coffeeGrams: values.coffeeGrams,
        waterMl: values.waterMl,
        waterTempC: isColdBrew ? null : (values.waterTempC ?? null),
        grindSize: values.grindSize,
        brewTime: values.brewTime,
        notes: values.notes?.trim() ? values.notes.trim() : null,
        tastingNotes: tastingNotes.length > 0 ? tastingNotes : null,
      });
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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mocha/70">Freestyle Brew</p>
        <h1 className="font-serif text-4xl font-bold leading-tight text-espresso">Log Your Brew Parameters</h1>
        <p className="mt-1 text-sm text-mocha/80">Capture this brew so we can coach your next one.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-3xl border border-mocha/10 bg-steam p-4 shadow-card">
        <div className="space-y-2">
          <Label htmlFor="coffee-grams">Coffee (g)</Label>
          <Input id="coffee-grams" type="number" step="0.1" {...form.register("coffeeGrams")} />
          {errors.coffeeGrams ? <p className="text-xs text-red-700">{errors.coffeeGrams.message}</p> : null}
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
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="grind-size">Grind Size</Label>
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="brew-time">Brew Time (mm:ss)</Label>
          <Input id="brew-time" placeholder="03:00" {...form.register("brewTime")} />
          {errors.brewTime ? <p className="text-xs text-red-700">{errors.brewTime.message}</p> : null}
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
