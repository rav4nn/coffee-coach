"use client";

import { useMemo } from "react";
import { COACH_TIPS } from "@/lib/coachTips";

export function CoachTip() {
  const tip = useMemo(
    () => COACH_TIPS[Math.floor(Math.random() * COACH_TIPS.length)],
    [],
  );

  return (
    <section className="px-6 py-4 mb-8">
      <div className="bg-[#fffbeb] border-2 border-primary rounded-2xl p-5 flex gap-4">
        <div className="flex-shrink-0">
          <span className="material-symbols-outlined text-primary text-2xl">lightbulb</span>
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="font-bold text-primary text-base">Coach's Secret</h4>
          <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
        </div>
      </div>
    </section>
  );
}
