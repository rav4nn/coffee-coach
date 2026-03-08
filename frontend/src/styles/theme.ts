/**
 * Coffee Coach design tokens.
 * Use these Tailwind class strings and raw values consistently across all pages.
 * Raw hex values are for cases where Tailwind classes aren't possible (e.g. SVG fill, inline style).
 */

export const colors = {
  primary: "#f49d25",
  backgroundDark: "#221a10",
  backgroundLight: "#fdf8f3",
};

/** Reusable Tailwind class bundles */
export const theme = {
  /** Full-bleed page wrapper — apply to the outermost element of each page */
  page: "overflow-y-auto pb-28",

  /** Horizontal + vertical section padding */
  section: "px-6 py-4",

  /** Latte gradient used on the greeting/hero section */
  heroSection: "px-6 py-6 latte-gradient",

  typography: {
    /** Page-level hero name */
    heroTitle: "text-3xl font-bold text-slate-100",
    /** Section headings like "Quick Actions", "Recent Brews" */
    sectionTitle: "text-lg font-bold text-slate-100",
    /** Small all-caps accent label (e.g. "GOOD MORNING") */
    accentLabel: "text-primary font-medium text-sm tracking-wider uppercase",
    /** Standard body copy */
    body: "text-sm text-slate-300 leading-relaxed",
    /** Muted secondary copy */
    caption: "text-xs text-slate-400",
    /** Muted tertiary copy */
    muted: "text-[10px] text-slate-500",
  },

  card: {
    /** Default interactive brew/content card */
    base: "rounded-xl bg-primary/5 border border-white/5 hover:border-primary/30 transition-all p-4",
    /** Elevated secondary card (darker fill) */
    elevated: "rounded-2xl bg-slate-800/50 border border-slate-700 p-4",
    /** Streak / info highlight card */
    highlight:
      "rounded-xl bg-primary/10 border border-primary/10 p-4 flex items-center gap-3",
    /** Coach tip / callout card */
    callout:
      "rounded-2xl border-2 border-primary bg-[#fffbeb] dark:bg-primary/10 p-5 flex gap-4",
  },

  button: {
    /** Primary CTA — orange fill */
    primary:
      "flex flex-col items-center justify-center gap-3 bg-primary text-white font-semibold p-6 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform",
    /** Secondary CTA — dark card style */
    secondary:
      "flex flex-col items-center justify-center gap-3 bg-slate-800/50 border border-slate-700 font-semibold p-6 rounded-2xl hover:scale-[1.02] transition-transform",
    /** Inline text link */
    ghost: "text-primary text-sm font-semibold hover:opacity-80 transition-opacity",
  },

  input: {
    base: "w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary/50 transition-colors",
    label: "text-sm font-medium text-slate-400 mb-1 block",
  },

  icon: {
    /** Icon container with primary tint */
    tinted:
      "size-14 rounded-lg bg-background-dark flex items-center justify-center text-primary border border-primary/20",
    /** Small icon badge */
    badge: "bg-primary/20 p-3 rounded-lg text-primary",
  },
};
