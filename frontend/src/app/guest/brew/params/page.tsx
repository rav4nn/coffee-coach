"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CompactFlowHeader } from "@/components/CompactFlowHeader";
import { MethodPicker, type MethodCardId } from "@/components/MethodPicker";
import { Input } from "@/components/ui/input";
import { useGuestBrewStore } from "@/lib/guestBrewStore";
import { HOFFMANN_DEFAULTS } from "@/lib/methodDefaults";

const grindSizeOptions = ["Extra Fine", "Fine", "Medium-Fine", "Medium", "Medium-Coarse", "Coarse"] as const;

/** Pour-over sub-devices shown after selecting pour_over. */
const POUR_OVER_DEVICES: { id: string; label: string }[] = [
  { id: "v60", label: "V60" },
  { id: "chemex", label: "Chemex" },
  { id: "kalita_wave", label: "Kalita Wave" },
  { id: "clever_dripper", label: "Clever Dripper" },
  { id: "hario_switch", label: "Hario Switch" },
  { id: "origami_dripper", label: "Origami" },
];

export default function GuestBrewStep2() {
  const router = useRouter();
  const store = useGuestBrewStore();

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [pourOverDevice, setPourOverDevice] = useState<string | null>(null);
  const [beanName, setBeanName] = useState(store.beanName ?? "");
  const [coffeeGrams, setCoffeeGrams] = useState<string>("");
  const [waterMl, setWaterMl] = useState<string>("");
  const [waterTempC, setWaterTempC] = useState<string>("");
  const [grindSize, setGrindSize] = useState<string>("Medium");
  const [brewTime, setBrewTime] = useState<string>("");

  const effectiveMethodId = selectedCard === "pour_over" ? pourOverDevice : selectedCard;
  const isColdBrew = effectiveMethodId === "cold_brew";

  // Auto-fill defaults when method changes
  useEffect(() => {
    if (!effectiveMethodId) return;
    const defaults = HOFFMANN_DEFAULTS[effectiveMethodId];
    if (!defaults) return;
    setCoffeeGrams(String(defaults.coffeeGrams));
    setWaterMl(defaults.waterMl != null ? String(defaults.waterMl) : "");
    setWaterTempC(defaults.waterTempC != null ? String(defaults.waterTempC) : "");
    setGrindSize(defaults.grindSize);
    setBrewTime(defaults.brewTime);
  }, [effectiveMethodId]);

  function handleMethodSelect(id: string) {
    setSelectedCard(id);
    if (id !== "pour_over") {
      setPourOverDevice(null);
    }
  }

  const canProceed =
    effectiveMethodId != null &&
    coffeeGrams !== "" &&
    brewTime !== "";

  function handleNext() {
    store.setMethodId(effectiveMethodId);
    store.setBeanName(beanName.trim() || null);
    store.setBrewParams({
      coffeeGrams: coffeeGrams ? Number(coffeeGrams) : null,
      waterMl: waterMl ? Number(waterMl) : null,
      waterTempC: waterTempC ? Number(waterTempC) : null,
      grindSize,
      brewTime,
    });
    router.push("/guest/brew/rate");
  }

  return (
    <main className="overflow-y-auto pb-28">
      <CompactFlowHeader
        title="Fix My Brew"
        onBack={() => router.back()}
        showProgress
        progressCount={3}
        currentStep={2}
      />

      <div className="px-4 pt-4 space-y-5">
        {/* Method picker */}
        <div>
          <h2 className="text-lg font-bold text-slate-100 mb-1">How did you brew it?</h2>
          <p className="text-sm text-slate-400 mb-1">Pick your brewing method.</p>
          <MethodPicker selectedMethod={selectedCard} onSelect={handleMethodSelect} />
        </div>

        {/* Pour-over sub-devices */}
        {selectedCard === "pour_over" && (
          <div>
            <p className="text-sm text-slate-400 mb-2">Which pour over device?</p>
            <div className="grid grid-cols-3 gap-2">
              {POUR_OVER_DEVICES.map((d) => {
                const active = pourOverDevice === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setPourOverDevice(d.id)}
                    className={`h-10 rounded-xl text-xs font-normal transition-all ${
                      active
                        ? "bg-primary/20 border-2 border-primary text-primary"
                        : "bg-steam border border-white/10 text-slate-300 hover:border-primary/30"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bean name (optional) */}
        {effectiveMethodId && (
          <>
            <div>
              <label className="mb-1 block text-[11px] font-normal uppercase tracking-wider text-slate-500">
                Bean name (optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. Blue Tokai Attikan Estate"
                value={beanName}
                onChange={(e) => setBeanName(e.target.value)}
              />
            </div>

            {/* Brew parameters */}
            <div className="rounded-2xl border border-primary/10 bg-steam p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-lg">coffee_maker</span>
                <h3 className="text-xs font-normal uppercase tracking-widest text-slate-400">Brew Parameters</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-normal uppercase tracking-wider text-slate-500">Coffee (g)</label>
                  <Input type="number" step="0.1" value={coffeeGrams} onChange={(e) => setCoffeeGrams(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-normal uppercase tracking-wider text-slate-500">Water (ml)</label>
                  <Input type="number" step="1" value={waterMl} onChange={(e) => setWaterMl(e.target.value)} />
                </div>
              </div>

              <div className={`grid gap-3 ${isColdBrew ? "grid-cols-1" : "grid-cols-2"}`}>
                {!isColdBrew && (
                  <div>
                    <label className="mb-1 block text-[11px] font-normal uppercase tracking-wider text-slate-500">Temp (°C)</label>
                    <Input type="number" step="1" value={waterTempC} onChange={(e) => setWaterTempC(e.target.value)} />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-[11px] font-normal uppercase tracking-wider text-slate-500">Brew Time</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="mm:ss"
                    value={brewTime}
                    onChange={(e) => setBrewTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-normal uppercase tracking-wider text-slate-500">Grind Size</label>
                <select
                  value={grindSize}
                  onChange={(e) => setGrindSize(e.target.value)}
                  className="h-10 w-full rounded-xl border border-mocha/20 bg-steam px-3 text-sm text-espresso outline-none focus:ring-2 focus:ring-mocha/40"
                >
                  {grindSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              disabled={!canProceed}
              onClick={handleNext}
              className="w-full bg-primary text-background-dark font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all disabled:opacity-40 disabled:shadow-none hover:enabled:scale-[1.01]"
            >
              Next →
            </button>
          </>
        )}
      </div>
    </main>
  );
}
