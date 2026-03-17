const DEFAULT_SYMPTOMS = [
  "Sour",
  "Bitter",
  "Weak/Watery",
  "Flat/No Sweetness",
  "Muddy/Silty",
  "Woody/Papery",
];

export function SymptomPicker({
  options = DEFAULT_SYMPTOMS,
  selected = [],
  onToggle,
}: {
  options?: string[];
  selected?: string[];
  onToggle?: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle?.(option)}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? "border-primary bg-primary/20 text-primary"
                : "border-primary/20 bg-primary/5 text-primary/70"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
