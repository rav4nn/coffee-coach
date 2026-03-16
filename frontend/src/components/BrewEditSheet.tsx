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

/** Auto-format a brew time input: as user types digits, format as mm:ss */
function formatBrewTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}`;
}

function isValidBrewTime(val: string): boolean {
  return /^\d+:\d{2}$/.test(val);
}

function normalizeBrewTime(val: string): string {
  const match = val.match(/^(\d+):(\d{2})$/);
  if (!match) return "00:00";
  const mins = parseInt(match[1], 10);
  const secs = Math.min(59, parseInt(match[2], 10));
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

interface BrewEditSheetProps {
  entry: FreestyleBrewEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const inputClass =
  "w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-slate-100 outline-none focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export function BrewEditSheet({ entry, open, onOpenChange }: BrewEditSheetProps) {
  const updateEntry = useBrewHistoryStore((s) => s.updateEntry);

  const [coffeeGrams, setCoffeeGrams] = useState("");
  const [waterMl, setWaterMl] = useState("");
  const [waterTempC, setWaterTempC] = useState("");
  const [grindSize, setGrindSize] = useState<FreestyleBrewEntry["grindSize"]>("Medium");
  const [grinderName, setGrinderName] = useState<string | null>(null);
  const [grinderClicks, setGrinderClicks] = useState("");
  const [useClicks, setUseClicks] = useState(false);
  const [brewTimeDisplay, setBrewTimeDisplay] = useState("00:00");
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
    setGrinderName(entry.grinderName ?? null);
    setGrinderClicks(entry.grinderClicks ? String(entry.grinderClicks) : "");
    setUseClicks(!!entry.grinderName && !!entry.grinderClicks);
    const bt = entry.brewTime ?? "00:00";
    setBrewTime(bt);
    setBrewTimeDisplay(bt);
    setNotes(entry.notes ?? "");
    setTastingNotes(entry.tastingNotes ?? []);
    setError(null);
  }, [entry?.id]);

  function handleBrewTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatBrewTimeInput(e.target.value);
    setBrewTimeDisplay(formatted);
    if (isValidBrewTime(formatted)) {
      setBrewTime(normalizeBrewTime(formatted));
    }
  }

  async function handleSave() {
    if (!entry) return;
    setSaving(true);
    setError(null);
    try {
      await updateEntry(entry.id, {
        coffeeGrams: coffeeGrams ? parseFloat(coffeeGrams) : entry.coffeeGrams,
        waterMl: waterMl ? parseFloat(waterMl) : entry.waterMl,
        waterTempC: isColdBrew ? null : (waterTempC ? parseFloat(waterTempC) : entry.waterTempC),
        grindSize: useClicks ? entry.grindSize : grindSize,
        grinderName: useClicks ? grinderName : null,
        grinderClicks: useClicks && grinderClicks ? parseInt(grinderClicks, 10) : null,
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
        <p className="text-xl font-bold text-slate-100 mb-5">Update Brew Parameters</p>

        <div className="space-y-4">
          {/* ── Brewing Essentials ───────────────────────────── */}
          <div className="rounded-2xl border border-primary/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-lg">coffee_maker</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Brewing Essentials</h3>
            </div>

            {/* Row 1: Coffee + Water */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Coffee (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={coffeeGrams}
                  onChange={(e) => setCoffeeGrams(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Water (ml)
                </label>
                <input
                  type="number"
                  step="1"
                  value={waterMl}
                  onChange={(e) => setWaterMl(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Row 2: Temp + Brew Time */}
            <div className={`grid gap-3 ${isColdBrew ? "grid-cols-1" : "grid-cols-2"}`}>
              {!isColdBrew && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={waterTempC}
                    onChange={(e) => setWaterTempC(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  {isColdBrew ? "Brew Time (h:mm)" : "Brew Time"}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={isColdBrew ? "h:mm" : "mm:ss"}
                  value={brewTimeDisplay}
                  onChange={handleBrewTimeChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* ── Grind Setting ────────────────────────────────── */}
          <div className="rounded-2xl border border-primary/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">tune</span>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Grind Setting</h3>
              </div>
              {grinderName && (
                <button
                  type="button"
                  onClick={() => setUseClicks((v) => !v)}
                  className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 hover:text-primary transition-colors"
                >
                  {useClicks ? "Use grind size" : "Use clicks"}
                </button>
              )}
            </div>

            {useClicks && grinderName ? (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Clicks on {grinderName}
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="e.g. 24"
                  value={grinderClicks}
                  onChange={(e) => setGrinderClicks(e.target.value)}
                  className={inputClass}
                />
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
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
            )}
          </div>

          {/* ── Tasting Notes ────────────────────────────────── */}
          <div className="rounded-2xl border border-primary/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-lg">restaurant</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">How did it taste?</h3>
            </div>
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

          {/* ── Notes ────────────────────────────────────────── */}
          <div className="rounded-2xl border border-primary/10 bg-white/[0.03] p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Notes</h3>
            </div>
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
