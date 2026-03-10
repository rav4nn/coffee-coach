import Link from "next/link";

export function QuickActions() {
  return (
    <section className="px-6 py-4">
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/log-brew"
          className="flex flex-col items-center justify-center gap-3 bg-primary text-white font-semibold p-6 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
        >
          <span className="material-symbols-outlined text-3xl">coffee_maker</span>
          <span>Start Brew</span>
        </Link>
        <Link
          href="/history"
          className="flex flex-col items-center justify-center gap-3 bg-slate-800/50 border border-slate-700 text-slate-100 font-semibold p-6 rounded-2xl hover:scale-[1.02] transition-transform"
        >
          <span className="material-symbols-outlined text-3xl text-primary">menu_book</span>
          <span>My Journal</span>
        </Link>
      </div>
    </section>
  );
}
