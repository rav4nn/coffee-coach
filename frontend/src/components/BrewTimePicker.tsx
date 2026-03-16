"use client";

type Props = {
  value: string; // "mm:ss" normally, "h:mm" for cold brew
  onChange: (value: string) => void;
  className?: string;
  /** When true, shows h:mm (hours:minutes) instead of mm:ss */
  coldBrew?: boolean;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function BrewTimePicker({ value, onChange, className, coldBrew = false }: Props) {
  const parts = value.split(":");
  const first = Math.max(0, parseInt(parts[0] ?? "0", 10) || 0);
  const second = Math.max(0, Math.min(59, parseInt(parts[1] ?? "0", 10) || 0));

  function setFirst(val: number) {
    onChange(`${pad(Math.max(0, Math.min(99, val)))}:${pad(second)}`);
  }
  function setSecond(val: number) {
    onChange(`${pad(first)}:${pad(Math.max(0, Math.min(59, val)))}`);
  }

  const firstLabel = coldBrew ? "hr" : "min";
  const secondLabel = coldBrew ? "min" : "sec";

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      {/* First unit (min or hr) */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => setFirst(first + 1)}
          className="size-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-sm">expand_less</span>
        </button>
        <input
          type="number"
          min={0}
          max={99}
          value={pad(first)}
          onChange={(e) => setFirst(parseInt(e.target.value, 10) || 0)}
          className="w-14 h-12 rounded-xl bg-white/5 border border-white/10 text-center text-xl font-bold text-slate-100 outline-none focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => setFirst(Math.max(0, first - 1))}
          className="size-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-sm">expand_more</span>
        </button>
        <span className="text-[10px] font-bold uppercase text-slate-500">{firstLabel}</span>
      </div>

      <span className="text-2xl font-bold text-slate-400 mb-4">:</span>

      {/* Second unit (sec or min) */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => setSecond(second + 1)}
          className="size-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-sm">expand_less</span>
        </button>
        <input
          type="number"
          min={0}
          max={59}
          value={pad(second)}
          onChange={(e) => setSecond(parseInt(e.target.value, 10) || 0)}
          className="w-14 h-12 rounded-xl bg-white/5 border border-white/10 text-center text-xl font-bold text-slate-100 outline-none focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => setSecond(Math.max(0, second - 1))}
          className="size-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-sm">expand_more</span>
        </button>
        <span className="text-[10px] font-bold uppercase text-slate-500">{secondLabel}</span>
      </div>
    </div>
  );
}
