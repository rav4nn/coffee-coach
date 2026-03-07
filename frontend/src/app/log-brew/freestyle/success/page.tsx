import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function FreestyleSuccessPage() {
  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-mocha/10 bg-steam p-6 text-center shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mocha/70">Freestyle Brew</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-espresso">Brew Logged!</h1>
        <p className="mt-2 text-sm text-mocha/80">Your brew parameters were saved. You can continue improving from the dashboard.</p>
        <Button asChild className="mt-5 h-12 w-full text-base">
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </section>
  );
}
