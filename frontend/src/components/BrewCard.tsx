interface BrewCardProps {
  name: string;
  method: string;
  rating: number; // 0-5
  timeAgo: string;
  icon: string;
}

export function BrewCard({ name, method, rating, timeAgo, icon }: BrewCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-white/5 hover:border-primary/30 transition-all">
      <div className="size-14 rounded-lg bg-background-dark flex items-center justify-center text-primary border border-primary/20">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-slate-100">{name}</h4>
        <p className="text-xs text-slate-400">{method}</p>
      </div>
      <div className="text-right">
        <div className="flex text-primary">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`material-symbols-outlined text-sm ${i < rating ? "fill-current" : ""
                }`}
            >
              star
            </span>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mt-1">{timeAgo}</p>
      </div>
    </div>
  );
}
