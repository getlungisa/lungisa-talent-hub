type Extras = {
  trained_on?: string | null;
  work_history?: string | null;
  proud_of?: string | null;
};

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export function CandidateExtras({
  candidate,
  className = "",
}: {
  candidate: object;
  className?: string;
}) {
  const c = candidate as Extras;
  const rows = [
    { label: "Trained on", value: clean(c.trained_on) },
    { label: "Work history", value: clean(c.work_history) },
    { label: "Proud of", value: clean(c.proud_of) },
  ].filter((row) => row.value);

  if (rows.length === 0) return null;

  return (
    <dl className={`space-y-3 ${className}`}>
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {row.label}
          </dt>
          <dd className="mt-0.5 break-words text-sm leading-6 text-foreground">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
