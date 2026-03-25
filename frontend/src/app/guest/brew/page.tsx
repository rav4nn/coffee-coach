"use client";

import { useRouter } from "next/navigation";

import { CompactFlowHeader } from "@/components/CompactFlowHeader";
import { SymptomPicker } from "@/components/SymptomPicker";
import { GoalPicker } from "@/components/GoalPicker";
import { useGuestBrewStore } from "@/lib/guestBrewStore";

export default function GuestBrewStep1() {
  const router = useRouter();
  const symptoms = useGuestBrewStore((s) => s.symptoms);
  const goals = useGuestBrewStore((s) => s.goals);
  const setSymptoms = useGuestBrewStore((s) => s.setSymptoms);
  const setGoals = useGuestBrewStore((s) => s.setGoals);

  function toggleSymptom(value: string) {
    if (symptoms.includes(value)) {
      setSymptoms(symptoms.filter((s) => s !== value));
    } else {
      setSymptoms([...symptoms, value]);
    }
  }

  function toggleGoal(value: string) {
    // Single-select: tap again to deselect
    setGoals(goals.includes(value) ? [] : [value]);
  }

  const canProceed = symptoms.length > 0;

  return (
    <main className="overflow-y-auto pb-28">
      <CompactFlowHeader
        title="Fix My Brew"
        onBack={() => router.push("/")}
        showProgress
        progressCount={3}
        currentStep={1}
      />

      <div className="px-4 pt-4 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-100 mb-1">
            What&apos;s wrong with your cup?
          </h2>
          <p className="text-sm text-slate-400 mb-3">Pick everything you noticed.</p>
          <SymptomPicker selected={symptoms} onToggle={toggleSymptom} />
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-100 mb-1">
            Anything you want to improve?
          </h2>
          <p className="text-sm text-slate-400 mb-3">Optional — pick one.</p>
          <GoalPicker selected={goals} maxSelections={1} onToggle={toggleGoal} />
        </div>

        <button
          type="button"
          disabled={!canProceed}
          onClick={() => router.push("/guest/brew/params")}
          className="w-full bg-primary text-background-dark font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all disabled:opacity-40 disabled:shadow-none hover:enabled:scale-[1.01]"
        >
          Next →
        </button>
      </div>
    </main>
  );
}
