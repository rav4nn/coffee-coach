const DEFAULT_SYMPTOMS = [
  "Sour",
  "Bitter",
  "Weak/Watery",
  "Flat/No Sweetness",
  "Muddy/Silty",
  "Woody/Papery",
  "Hollow",
];

export function SymptomPicker({
  options = DEFAULT_SYMPTOMS,
  selected,
  onSelect,
}: {
  options?: string[];
  selected?: string | null;
  onSelect?: (value: string) => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-mocha/10 bg-steam p-4">
      <p className="mb-3 text-sm font-semibold text-espresso">Pick a taste symptom</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const active = selected === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect?.(option)}
              className={`rounded-xl border px-3 py-2 text-left text-sm ${
                active ? "border-mocha bg-latte/60 text-espresso" : "border-mocha/15 bg-cream text-mocha"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
