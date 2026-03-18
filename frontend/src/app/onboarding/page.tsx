"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import Image from "next/image";

import { getGrindersApi, patchUserProfileApi } from "@/lib/api";

type MethodCardId =
  | "pour_over"
  | "aeropress"
  | "french_press"
  | "moka_pot"
  | "cold_brew"
  | "south_indian_filter";

const BREW_METHODS: { id: MethodCardId; label: string; icon: string }[] = [
  { id: "pour_over",           label: "Pour Over",      icon: "water_drop" },
  { id: "aeropress",           label: "AeroPress",      icon: "compress" },
  { id: "french_press",        label: "French Press",   icon: "coffee_maker" },
  { id: "moka_pot",            label: "Moka Pot",       icon: "soup_kitchen" },
  { id: "cold_brew",           label: "Cold Brew",      icon: "ac_unit" },
  { id: "south_indian_filter", label: "Filter Kaapi",   icon: "filter_alt" },
];

export default function OnboardingPage() {
  const { data: session, update } = useSession();

  const [name, setName] = useState(session?.user?.name ?? "");
  const [equipment, setEquipment] = useState<MethodCardId[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Grinder state
  const [grinderList, setGrinderList] = useState<string[]>([]);
  const [grinderName, setGrinderName] = useState<string | null>(null);
  const [showGrinderPicker, setShowGrinderPicker] = useState(false);
  const [customGrinderMode, setCustomGrinderMode] = useState(false);
  const [customGrinderInput, setCustomGrinderInput] = useState("");
  const [grinderError, setGrinderError] = useState<string | null>(null);
  const grinderSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getGrindersApi().then(setGrinderList).catch(() => {});
  }, []);

  const toggleEquipment = (id: MethodCardId) => {
    setEquipment((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  };

  const nameValid = /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(name.trim());

  const handleSubmit = async () => {
    if (!nameValid) {
      setNameError(name.trim().length === 0 ? "Please enter your name." : "Name must contain only letters and spaces.");
      return;
    }
    setNameError(null);

    setSaving(true);
    setError(null);
    try {
      await patchUserProfileApi({ name: name.trim(), age: 25, primary_equipment: equipment, grinder_name: grinderName });
      await update({ profile_complete: true });
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto overflow-x-hidden bg-background-dark font-display">
      <style>{`
        @keyframes kapiFloat {
          0%   { transform: translateY(0px); }
          50%  { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
        .kapi-float {
          animation: kapiFloat 2s ease-in-out infinite;
        }
      `}</style>

      {/* Coffee Coach title */}
      <div className="pt-10 text-center">
        <span
          className="text-2xl text-slate-100 tracking-wide"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
        >
          Coffee Coach
        </span>
      </div>

      {/* Kapi image */}
      <div className="flex justify-center mt-4">
        <Image
          src="/coach/img2_reading_book.png"
          alt="Coach Kapi"
          width={90}
          height={90}
          className="kapi-float object-contain"
          style={{ mixBlendMode: "screen" }}
        />
      </div>

      {/* Profile section */}
      <div className="flex px-6 pb-4 pt-4">
        <div className="flex w-full flex-col gap-4 items-center">
          <div className="flex gap-4 flex-col items-center">
            {/* Google profile picture */}
            <div className="w-24 h-24 rounded-full border-2 border-primary ring-4 ring-primary/10 shadow-xl overflow-hidden bg-primary/20 flex items-center justify-center">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? "Profile"}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {(session?.user?.name ?? "?")[0].toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex flex-col items-center">
              <p className="text-slate-100 text-2xl font-bold text-center">
                Welcome, {session?.user?.name?.split(" ")[0] ?? "Brewer"}
              </p>
              <p className="text-primary/70 text-sm text-center mt-1">
                Tell Kapi how you brew.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <main className="flex-1 px-6 space-y-6 pb-32 pt-2">
        {/* Name */}
        <label className="flex flex-col gap-2">
          <span className="text-slate-100 text-sm font-semibold uppercase tracking-wider ml-1">Full Name</span>
          <input
            className="w-full rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-primary/20 bg-primary/5 h-14 placeholder:text-primary/30 px-4 text-base transition-all"
            placeholder="Enter your name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError(null); }}
          />
          {nameError && <p className="text-rose-400 text-xs ml-1">{nameError}</p>}
        </label>

        {/* Primary equipment */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-100 text-sm font-semibold uppercase tracking-wider ml-1">How do you brew?</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {BREW_METHODS.map((method) => {
              const active = equipment.includes(method.id);
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => toggleEquipment(method.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    active
                      ? "bg-primary border-primary text-background-dark"
                      : "bg-primary/5 border-white/5 text-slate-300 hover:border-primary/30"
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl mb-2">{method.icon}</span>
                  <span className="text-[10px] font-bold uppercase text-center leading-tight">{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grinder */}
        <div ref={grinderSectionRef} className="space-y-3">
          {grinderName ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30">
              <span className="material-symbols-outlined text-primary">coffee</span>
              <span className="flex-1 text-sm font-semibold text-slate-100 truncate">{grinderName}</span>
              <button
                type="button"
                onClick={() => { setGrinderName(null); setShowGrinderPicker(false); setCustomGrinderMode(false); setCustomGrinderInput(""); }}
                className="text-xs text-primary/70 hover:text-primary font-medium"
              >
                Remove
              </button>
            </div>
          ) : !showGrinderPicker ? (
            <button
              type="button"
              onClick={() => {
                setShowGrinderPicker(true);
                setTimeout(() => grinderSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
              }}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-primary/20 text-primary/60 hover:border-primary/40 hover:text-primary/80 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              <span className="text-sm font-medium">Got a grinder? Add it</span>
            </button>
          ) : (
            <div className="space-y-3">
              {!customGrinderMode ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {grinderList.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => { setGrinderName(g); setShowGrinderPicker(false); }}
                        className="p-2.5 rounded-xl bg-primary/5 border border-white/5 text-xs font-medium text-slate-300 text-left hover:border-primary/30 transition-colors truncate"
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomGrinderMode(true)}
                    className="text-[10px] text-primary font-bold uppercase tracking-widest hover:underline"
                  >
                    Add Custom — My grinder isn&apos;t listed
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <input
                    className="w-full rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-primary/20 bg-primary/5 h-12 placeholder:text-primary/30 px-4 text-sm transition-all"
                    placeholder="Enter grinder name"
                    type="text"
                    maxLength={20}
                    value={customGrinderInput}
                    onChange={(e) => { setCustomGrinderInput(e.target.value); setGrinderError(null); }}
                  />
                  {grinderError && <p className="text-rose-400 text-xs ml-1">{grinderError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setCustomGrinderMode(false); setCustomGrinderInput(""); setGrinderError(null); }}
                      className="flex-1 h-10 rounded-xl border border-primary/20 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = customGrinderInput.trim();
                        if (!trimmed || !/^[A-Za-z0-9]+(?:\s[A-Za-z0-9]+)*$/.test(trimmed)) {
                          setGrinderError("Letters, numbers, and spaces only (max 20 chars).");
                          return;
                        }
                        setGrinderName(trimmed);
                        setShowGrinderPicker(false);
                        setCustomGrinderMode(false);
                        setCustomGrinderInput("");
                        setGrinderError(null);
                      }}
                      className="flex-1 h-10 rounded-xl bg-primary text-background-dark text-sm font-bold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-rose-400 text-sm text-center">{error}</p>
        )}
      </main>

      {/* Bottom CTA — always visible at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent max-w-md mx-auto">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-background-dark font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <span>{saving ? "Saving…" : "Continue to Dashboard"}</span>
          {!saving && <span className="material-symbols-outlined">chevron_right</span>}
        </button>
      </div>
    </div>
  );
}
