const DEFAULT_SYMPTOMS = [
  "sour",
  "bitter",
  "weak/watery",
  "flat",
  "muddy/silty",
  "woody/papery",
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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle?.(option)}
            style={{
              height: 44,
              borderRadius: 22,
              border: active ? "2px solid #f49d25" : "1px solid rgba(255,255,255,0.125)",
              background: active ? "#3a2a1a" : "#2a1a0a",
              color: active ? "#f49d25" : "#f1f5f9",
              fontSize: 14,
              fontWeight: 400,
              textTransform: "capitalize",
              transition: "all 150ms ease",
              width: "100%",
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
