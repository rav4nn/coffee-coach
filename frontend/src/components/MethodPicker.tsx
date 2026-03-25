"use client";

import Image from "next/image";

export type MethodCardId =
  | "pour_over"
  | "aeropress"
  | "french_press"
  | "moka_pot"
  | "cold_brew"
  | "south_indian_filter";

export const SUPPORTED_METHODS: MethodCardId[] = [
  "pour_over",
  "aeropress",
  "french_press",
  "moka_pot",
  "cold_brew",
  "south_indian_filter",
];

export const METHOD_LABEL: Record<MethodCardId, string> = {
  pour_over: "Pour Over",
  aeropress: "AeroPress",
  french_press: "French Press",
  moka_pot: "Moka Pot",
  cold_brew: "Cold Brew",
  south_indian_filter: "Filter Kaapi",
};

export const METHOD_IMAGE: Record<MethodCardId, string> = {
  pour_over: "/coach/img1_pour_over.png",
  aeropress: "/coach/img1_aeropress.png",
  french_press: "/coach/img1_french_press.png",
  moka_pot: "/coach/img1_moka_pot.png",
  cold_brew: "/coach/img1_cold_brew.png",
  south_indian_filter: "/coach/img1_filter_kaapi.png",
};

interface MethodPickerProps {
  selectedMethod: string | null;
  onSelect: (methodId: string) => void;
  /** Optional filtered list of method IDs to display. Defaults to SUPPORTED_METHODS. */
  methods?: MethodCardId[];
}

export function MethodPicker({
  selectedMethod,
  onSelect,
  methods = SUPPORTED_METHODS,
}: MethodPickerProps) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-3">
      {methods.map((methodId) => {
        const active = selectedMethod === methodId;
        return (
          <button
            key={methodId}
            type="button"
            onClick={() => onSelect(methodId)}
            className={`relative rounded-xl overflow-hidden border-2 transition-all ${
              active
                ? "border-primary ring-2 ring-primary/40"
                : "border-white/5 hover:border-primary/30"
            }`}
          >
            <div className="relative aspect-[4/5]">
              <Image
                src={METHOD_IMAGE[methodId]}
                alt={METHOD_LABEL[methodId]}
                fill
                className="object-cover"
                sizes="33vw"
              />
              {active && <div className="absolute inset-0 bg-primary/25" />}
            </div>
            <div className="absolute bottom-0 inset-x-0 py-1.5 bg-background-dark/80 backdrop-blur-sm">
              <span className="block text-center text-[10px] font-normal uppercase leading-tight text-slate-100">
                {METHOD_LABEL[methodId]}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
