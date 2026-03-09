"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Image from "next/image";

import { patchUserProfileApi } from "@/lib/api";

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

const AVATARS = ["avatar_1", "avatar_2", "avatar_3", "avatar_4", "avatar_5"];

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState(session?.user?.name ?? "");
  const [age, setAge] = useState("");
  const [avatar, setAvatar] = useState("avatar_1");
  const [equipment, setEquipment] = useState<MethodCardId[]>([]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleEquipment = (id: MethodCardId) => {
    setEquipment((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  };

  const nameValid = name.trim().length > 0;
  const ageNum = parseInt(age, 10);
  const ageValid = age.length > 0 && !isNaN(ageNum) && ageNum >= 1 && ageNum <= 120;
  const canContinue = nameValid && ageValid;

  const handleSubmit = async () => {
    if (!canContinue) {
      if (!nameValid) { setError("Please enter your name."); return; }
      if (!ageValid) { setError("Please enter a valid age."); return; }
    }

    setSaving(true);
    setError(null);
    try {
      await patchUserProfileApi({ name: name.trim(), age: ageNum, avatar, primary_equipment: equipment });
      await update();
      router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto overflow-x-hidden bg-background-dark font-display">
      {/* Profile section */}
      <div className="flex pt-10 px-6 pb-4">
        <div className="flex w-full flex-col gap-4 items-center">
          <div className="flex gap-4 flex-col items-center">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-2 border-primary ring-4 ring-primary/10 shadow-xl overflow-hidden">
                <Image
                  src={`/avatars/${avatar}.png`}
                  alt="Selected avatar"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarPicker((v) => !v)}
                className="absolute bottom-0 right-0 bg-primary text-background-dark p-1.5 rounded-full border-2 border-background-dark"
                aria-label="Change avatar"
              >
                <span className="material-symbols-outlined text-sm block">photo_camera</span>
              </button>
            </div>

            {/* Avatar picker */}
            {showAvatarPicker && (
              <div className="flex flex-wrap justify-center gap-3">
                {AVATARS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setAvatar(id); setShowAvatarPicker(false); }}
                    className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${avatar === id ? "border-primary scale-110" : "border-transparent"}`}
                    aria-label={id}
                  >
                    <Image src={`/avatars/${id}.png`} alt={id} width={48} height={48} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col items-center">
              <p className="text-slate-100 text-2xl font-bold text-center">
                Welcome, {session?.user?.name?.split(" ")[0] ?? "Brewer"}
              </p>
              <p className="text-primary/70 text-sm text-center mt-1">
                Let&apos;s calibrate your brewing experience.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <main className="flex-1 px-6 space-y-6 pb-32 pt-6">
        {/* Name */}
        <label className="flex flex-col gap-2">
          <span className="text-slate-100 text-sm font-semibold uppercase tracking-wider ml-1">Full Name</span>
          <input
            className="w-full rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-primary/20 bg-primary/5 h-14 placeholder:text-primary/30 px-4 text-base transition-all"
            placeholder="Enter your name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        {/* Age */}
        <label className="flex flex-col gap-2">
          <span className="text-slate-100 text-sm font-semibold uppercase tracking-wider ml-1">Age</span>
          <div className="relative">
            <input
              className="w-full rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-primary/20 bg-primary/5 h-14 placeholder:text-primary/30 px-4 text-base transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="Enter your age"
              type="number"
              min={1}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/60 text-sm">YEARS</span>
          </div>
        </label>

        {/* Primary equipment */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-100 text-sm font-semibold uppercase tracking-wider ml-1">Primary Equipment</span>
            <span className="text-xs text-primary/60 font-medium">Optional</span>
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
          disabled={saving || !canContinue}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-background-dark font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <span>{saving ? "Saving…" : "Continue to Dashboard"}</span>
          {!saving && <span className="material-symbols-outlined">chevron_right</span>}
        </button>
      </div>
    </div>
  );
}
