const DEFAULT_GOALS = ["more sweetness", "more body", "more clarity", "cleaner finish", "consistency"];

export function GoalPicker({
  options = DEFAULT_GOALS,
  selected = [],
  maxSelections = 2,
  onToggle,
}: {
  options?: string[];
  selected?: string[];
  maxSelections?: number;
  onToggle?: (value: string) => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-mocha/10 bg-steam p-4">
      <p className="mb-1 text-sm font-semibold text-espresso">Pick your goal</p>
      <p className="mb-3 text-xs text-mocha/70">Select up to {maxSelections}</p>
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
              className={`rounded-full border px-3 py-1.5 text-sm ${
                active ? "border-mocha bg-latte/70 text-espresso" : "border-mocha/15 bg-cream text-mocha"
              } ${disabled ? "opacity-50" : ""}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
