"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { patchUserProfileApi } from "@/lib/api";

type MethodCardId =
  | "pour_over"
  | "aeropress"
  | "french_press"
  | "moka_pot"
  | "cold_brew"
  | "south_indian_filter";

const BREW_METHODS: { id: MethodCardId; label: string; icon: string }[] = [
  { id: "pour_over",           label: "Pour Over",    icon: "water_drop" },
  { id: "aeropress",           label: "AeroPress",    icon: "compress" },
  { id: "french_press",        label: "French Press", icon: "coffee_maker" },
  { id: "moka_pot",            label: "Moka Pot",     icon: "soup_kitchen" },
  { id: "cold_brew",           label: "Cold Brew",    icon: "ac_unit" },
  { id: "south_indian_filter", label: "Filter Kaapi", icon: "filter_alt" },
];

const AVATARS = ["avatar_1", "avatar_2", "avatar_3", "avatar_4", "avatar_5"];

export default function AccountInfoPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [avatar, setAvatar] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<MethodCardId[]>([]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from backend profile on mount
  useEffect(() => {
    fetch("/api/users/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((user) => {
        setAvatar(user.avatar ?? null);
        if (Array.isArray(user.primary_equipment)) {
          setEquipment(user.primary_equipment as MethodCardId[]);
        }
      })
      .catch(() => {});
  }, []);

  const toggleEquipment = (id: MethodCardId) => {
    setEquipment((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      // Fetch current name/age to keep them intact
      const profileRes = await fetch("/api/users/me", { cache: "no-store" });
      const profile = await profileRes.json();
      await patchUserProfileApi({
        name: profile.name ?? session?.user?.name ?? "Brewer",
        age: profile.age ?? 0,
        avatar: avatar ?? "avatar_1",
        primary_equipment: equipment,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto overflow-x-hidden bg-background-dark font-display">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-10 pb-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-primary/10 transition-colors text-slate-400 hover:text-primary"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">Account Info</h1>
      </div>

      {/* Profile section */}
      <div className="flex pt-4 px-6 pb-4">
        <div className="flex w-full flex-col gap-4 items-center">
          <div className="flex gap-4 flex-col items-center">
            {/* Avatar — show Google photo if no custom avatar is saved */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-2 border-primary ring-4 ring-primary/10 shadow-xl overflow-hidden">
                {!avatar && session?.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt="Google profile photo"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Image
                    src={`/avatars/${avatar ?? "avatar_1"}.png`}
                    alt="Selected avatar"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                )}
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
                    className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${(avatar ?? "avatar_1") === id ? "border-primary scale-110" : "border-transparent"}`}
                    aria-label={id}
                  >
                    <Image src={`/avatars/${id}.png`} alt={id} width={48} height={48} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <main className="flex-1 px-6 space-y-6 pb-32 pt-2">
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

        {error && <p className="text-rose-400 text-sm text-center">{error}</p>}
        {saved && <p className="text-green-400 text-sm text-center">Changes saved!</p>}
      </main>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent max-w-md mx-auto">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-background-dark font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <span>{saving ? "Saving…" : "Save Changes"}</span>
          {!saving && <span className="material-symbols-outlined">check</span>}
        </button>
      </div>
    </div>
  );
}
