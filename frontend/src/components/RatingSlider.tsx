export function RatingSlider({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <style>{`
        .coach-rating-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 999px;
          background:
            linear-gradient(
              to right,
              #f49d25 0%,
              #f49d25 calc((var(--value) - 1) / 9 * 100%),
              rgba(255,255,255,0.125) calc((var(--value) - 1) / 9 * 100%),
              rgba(255,255,255,0.125) 100%
            );
          outline: none;
        }
        .coach-rating-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: #f49d25;
          border: 0;
          box-shadow: 0 3px 10px rgba(244, 157, 37, 0.35);
          cursor: pointer;
        }
        .coach-rating-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: #f49d25;
          border: 0;
          box-shadow: 0 3px 10px rgba(244, 157, 37, 0.35);
          cursor: pointer;
        }
        .coach-rating-slider::-moz-range-track {
          height: 4px;
          border: 0;
          border-radius: 999px;
          background: rgba(255,255,255,0.125);
        }
      `}</style>

      <div className="flex items-center justify-between">
        <p className="text-sm font-normal text-slate-100">Rate This Brew</p>
        <p className="text-sm font-bold text-primary">{value}/10</p>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="coach-rating-slider mt-3"
        style={{ ["--value" as string]: value, opacity: disabled ? 0.6 : 1 }}
      />
      <div className="mt-2 flex justify-between">
        <span className="text-[11px] font-normal text-slate-500">Poor</span>
        <span className="text-[11px] font-normal text-slate-500">Excellent</span>
      </div>
    </div>
  );
}
