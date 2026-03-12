"use client";

type Props = {
  value: string; // "mm:ss"
  onChange: (value: string) => void;
  className?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function BrewTimePicker({ value, onChange, className }: Props) {
  const parts = value.split(":");
  const mins = Math.max(0, parseInt(parts[0] ?? "0", 10) || 0);
  const secs = Math.max(0, Math.min(59, parseInt(parts[1] ?? "0", 10) || 0));

  function setMins(val: number) {
    onChange(`${pad(Math.max(0, Math.min(99, val)))}:${pad(secs)}`);
  }
  function setSecs(val: number) {
    onChange(`${pad(mins)}:${pad(Math.max(0, Math.min(59, val)))}`);
  }

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      {/* Minutes */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => setMins(mins + 1)}
          className="size-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-sm">expand_less</span>
        </button>
        <input
          type="number"
          min={0}
          max={99}
          value={pad(mins)}
          onChange={(e) => setMins(parseInt(e.target.value, 10) || 0)}
          className="w-14 h-12 rounded-xl bg-white/5 border border-white/10 text-center text-xl font-bold text-slate-100 outline-none focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => setMins(Math.max(0, mins - 1))}
          className="size-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-sm">expand_more</span>
        </button>
        <span className="text-[10px] font-bold uppercase text-slate-500">min</span>
      </div>

      <span className="text-2xl font-bold text-slate-400 mb-4">:</span>

      {/* Seconds */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => setSecs(secs + 1)}
          className="size-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-sm">expand_less</span>
        </button>
        <input
          type="number"
          min={0}
          max={59}
          value={pad(secs)}
          onChange={(e) => setSecs(parseInt(e.target.value, 10) || 0)}
          className="w-14 h-12 rounded-xl bg-white/5 border border-white/10 text-center text-xl font-bold text-slate-100 outline-none focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => setSecs(Math.max(0, secs - 1))}
          className="size-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-sm">expand_more</span>
        </button>
        <span className="text-[10px] font-bold uppercase text-slate-500">sec</span>
      </div>
    </div>
  );
}
