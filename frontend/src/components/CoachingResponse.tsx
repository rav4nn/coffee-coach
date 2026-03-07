export function CoachingResponse({
  fix,
  freshnessCaveat,
  trend,
}: {
  fix?: string;
  freshnessCaveat?: string;
  trend?: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-mocha/10 bg-steam p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-mocha/70">Coaching Response</p>
      <p className="mt-2 text-lg font-semibold text-espresso">
        {fix ?? "Select a symptom or goal to get your next brewing tweak."}
      </p>
      {freshnessCaveat ? <p className="mt-2 text-sm text-mocha/75">Freshness note: {freshnessCaveat}</p> : null}
      {trend ? <p className="mt-2 text-sm text-mocha/75">Trend: {trend}</p> : null}
    </div>
  );
}
