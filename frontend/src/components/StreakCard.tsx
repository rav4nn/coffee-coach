interface StreakCardProps {
    streakCount: number;
    streakLabel: string;
}

export function StreakCard({ streakCount, streakLabel }: StreakCardProps) {
    return (
        <div className="mt-4 flex items-center gap-3 bg-white/50 dark:bg-primary/10 border border-primary/10 rounded-xl p-4 w-full">
            <div className="bg-primary/20 p-3 rounded-lg text-primary">
                <span className="material-symbols-outlined scale-125">local_fire_department</span>
            </div>
            <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Current Streak</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {streakCount} {streakLabel}
                </p>
            </div>
        </div>
    );
}
