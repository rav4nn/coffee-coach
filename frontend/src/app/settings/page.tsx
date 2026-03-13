"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";

const GOAL_KEY = "cc_weekly_goal";
const DEFAULT_GOAL = 7;

export default function SettingsPage() {
  const router = useRouter();
  const [weeklyGoal, setWeeklyGoal] = useState(DEFAULT_GOAL);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(GOAL_KEY);
    if (stored) setWeeklyGoal(Number(stored));
  }, []);

  function updateGoal(val: number) {
    const clamped = Math.max(1, Math.min(14, val));
    setWeeklyGoal(clamped);
    localStorage.setItem(GOAL_KEY, String(clamped));
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/users/me", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account. Please try again.");
      await signOut({ callbackUrl: "/login" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background-dark font-display flex flex-col max-w-phone mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-primary/10">
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-primary transition-colors"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">Settings</h1>
      </div>

      <div className="flex-1 px-6 py-6 flex flex-col gap-6">
        {/* Weekly Goal */}
        <section className="rounded-xl bg-primary/5 border border-primary/10 p-5">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Weekly Brew Goal</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-200 text-sm font-medium">Brews per week</p>
              <p className="text-xs text-slate-500 mt-0.5">Tracks your progress in the profile</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateGoal(weeklyGoal - 1)}
                className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                aria-label="Decrease goal"
              >
                <span className="material-symbols-outlined text-base">remove</span>
              </button>
              <span className="text-2xl font-bold text-primary w-7 text-center">{weeklyGoal}</span>
              <button
                onClick={() => updateGoal(weeklyGoal + 1)}
                className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                aria-label="Increase goal"
              >
                <span className="material-symbols-outlined text-base">add</span>
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="rounded-xl bg-red-500/5 border border-red-500/20 p-5 mt-auto">
          <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-4">Danger Zone</h2>
          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/10 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                This will permanently delete your account and all your brew data. Your Google account will be freed so you can sign up again.
              </p>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="w-full py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, Delete My Account"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="w-full py-3 rounded-xl text-slate-400 text-sm font-medium hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
