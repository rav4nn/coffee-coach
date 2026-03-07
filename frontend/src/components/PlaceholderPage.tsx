import Link from "next/link";

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mocha/70">
          {eyebrow}
        </p>
        <h1 className="font-serif text-4xl font-bold leading-tight text-espresso">
          {title}
        </h1>
        <p className="max-w-md text-sm leading-6 text-mocha/80">{description}</p>
      </div>
      <div className="rounded-[2rem] border border-mocha/10 bg-steam p-5 shadow-card">
        <p className="text-sm text-mocha/75">
          Placeholder scaffold. Feature work can layer onto this route next.
        </p>
        {primaryHref && primaryLabel ? (
          <Link
            href={primaryHref}
            className="mt-4 inline-flex rounded-full bg-mocha px-4 py-2 text-sm font-medium text-cream"
          >
            {primaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
