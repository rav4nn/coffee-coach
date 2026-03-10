"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useBrewHistoryStore, type FreestyleBrewEntry } from "@/lib/brewHistoryStore";

const TASTING_CHIPS = ["Sweet", "Sour", "Bitter", "Bright", "Flat", "Roasty", "Floral", "Fruity", "Nutty", "Chocolatey"] as const;

const GRIND_SIZES = [
  "Extra Fine",
  "Fine",
  "Medium-Fine",
  "Medium",
  "Medium-Coarse",
  "Coarse",
] as const;

interface BrewEditSheetProps {
  entry: FreestyleBrewEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrewEditSheet({ entry, open, onOpenChange }: BrewEditSheetProps) {
  const updateEntry = useBrewHistoryStore((s) => s.updateEntry);

  const [coffeeGrams, setCoffeeGrams] = useState("");
  const [waterMl, setWaterMl] = useState("");
  const [waterTempC, setWaterTempC] = useState("");
  const [grindSize, setGrindSize] = useState<FreestyleBrewEntry["grindSize"]>("Medium");
  const [brewTime, setBrewTime] = useState("00:00");
  const [notes, setNotes] = useState("");
  const [tastingNotes, setTastingNotes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isColdBrew = entry?.methodId === "cold_brew";

  useEffect(() => {
    if (!entry) return;
    setCoffeeGrams(entry.coffeeGrams ? String(entry.coffeeGrams) : "");
    setWaterMl(entry.waterMl ? String(entry.waterMl) : "");
    setWaterTempC(entry.waterTempC ? String(entry.waterTempC) : "");
    setGrindSize(entry.grindSize ?? "Medium");
    setBrewTime(entry.brewTime ?? "00:00");
    setNotes(entry.notes ?? "");
    setTastingNotes(entry.tastingNotes ?? []);
    setError(null);
  }, [entry?.id]);

  async function handleSave() {
    if (!entry) return;
    setSaving(true);
    setError(null);
    try {
      await updateEntry(entry.id, {
        coffeeGrams: coffeeGrams ? parseFloat(coffeeGrams) : entry.coffeeGrams,
        waterMl: waterMl ? parseFloat(waterMl) : entry.waterMl,
        waterTempC: isColdBrew ? null : (waterTempC ? parseFloat(waterTempC) : entry.waterTempC),
        grindSize,
        brewTime,
        notes: notes.trim() || null,
        tastingNotes: tastingNotes.length > 0 ? tastingNotes : null,
      });
      onOpenChange(false);
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="rounded-t-3xl bg-[#1a0f00] border-t border-primary/20 overflow-y-auto max-h-[85dvh] px-5 pb-8"
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5 mt-2" />
        <SheetTitle className="text-xs font-bold uppercase tracking-widest text-primary/70 mb-1">
          Edit Brew
        </SheetTitle>
        <p className="text-xl font-bold text-slate-100 mb-6">Update Brew Parameters</p>

        <div className="space-y-4">
          {/* Coffee grams */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Coffee (g)
            </label>
            <input
              type="number"
              step="0.1"
              value={coffeeGrams}
              onChange={(e) => setCoffeeGrams(e.target.value)}
              className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-slate-100 outline-none focus:border-primary/50"
            />
          </div>

          {/* Water ml */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Water (ml)
            </label>
            <input
              type="number"
              step="1"
              value={waterMl}
              onChange={(e) => setWaterMl(e.target.value)}
              className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-slate-100 outline-none focus:border-primary/50"
            />
          </div>

          {/* Water temp (hidden for cold brew) */}
          {!isColdBrew && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Water Temperature (°C)
              </label>
              <input
                type="number"
                step="1"
                value={waterTempC}
                onChange={(e) => setWaterTempC(e.target.value)}
                className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-slate-100 outline-none focus:border-primary/50"
              />
            </div>
          )}

          {/* Grind size */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Grind Size
            </label>
            <select
              value={grindSize}
              onChange={(e) => setGrindSize(e.target.value as FreestyleBrewEntry["grindSize"])}
              className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-slate-100 outline-none focus:border-primary/50"
            >
              {GRIND_SIZES.map((s) => (
                <option key={s} value={s} className="bg-[#1a0f00]">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Brew time */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Brew Time (mm:ss)
            </label>
            <input
              type="text"
              value={brewTime}
              onChange={(e) => setBrewTime(e.target.value)}
              placeholder="03:00"
              className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-slate-100 outline-none focus:border-primary/50"
            />
          </div>

          {/* Tasting notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              How did it taste?
            </label>
            <div className="flex flex-wrap gap-2">
              {TASTING_CHIPS.map((chip) => {
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
                        ? "bg-primary text-background-dark border-primary"
                        : "bg-primary/10 text-primary/80 border-primary/20"
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations about this brew..."
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-primary/50 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 rounded-xl bg-primary text-background-dark font-bold text-sm disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
