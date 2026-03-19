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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {options.map((option, index) => {
        const active = selected.includes(option);
        const disabled = !active && selected.length >= maxSelections;
        const isLastOdd = options.length % 2 !== 0 && index === options.length - 1;
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onToggle?.(option)}
            style={{
              height: 44,
              borderRadius: 22,
              border: active ? "2px solid #f49d25" : "1px solid rgba(255,255,255,0.125)",
              background: active ? "#3a2a1a" : "#2a1a0a",
              color: active ? "#f49d25" : "#f1f5f9",
              fontSize: 14,
              fontWeight: 600,
              textTransform: "capitalize",
              transition: "all 150ms ease",
              width: "100%",
              opacity: disabled ? 0.4 : 1,
              gridColumn: isLastOdd ? "1 / -1" : undefined,
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
