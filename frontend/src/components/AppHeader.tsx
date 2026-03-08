// Username is static for now — will be replaced by auth/profile data later.
const USERNAME = "Brewmaster Jack";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 bg-background-dark/80 backdrop-blur-md">
      <button className="flex items-center justify-center p-2 rounded-full hover:bg-primary/10 transition-colors">
        <span className="material-symbols-outlined text-slate-300">coffee_maker</span>
      </button>
      <h1 className="text-xl font-bold tracking-tight text-slate-100">Coffee Coach</h1>
      <div className="w-10 h-10 rounded-full border-2 border-primary/30 bg-primary/20 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-primary">{getInitials(USERNAME)}</span>
      </div>
    </header>
  );
}
