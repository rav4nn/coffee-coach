const DEFAULT_GOALS = [
  "more sweetness",
  "more body",
  "more clarity",
  "less bitter",
  "less sour",
  "more balanced",
];

export function GoalPicker({
  options = DEFAULT_GOALS,
  selected = [],
  maxSelections = 1,
  onToggle,
}: {
  options?: string[];
  selected?: string[];
  maxSelections?: number;
  onToggle?: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        const disabled = !active && selected.length >= maxSelections;
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onToggle?.(option)}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? "border-primary bg-primary/20 text-primary"
                : "border-primary/20 bg-primary/5 text-primary/70"
            } ${disabled ? "opacity-40" : ""}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
