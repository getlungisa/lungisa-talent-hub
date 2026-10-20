type Extras = {
  trained_on?: string | null;
  work_history?: string | null;
  proud_of?: string | null;
};

type ExtraField = keyof Extras;

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export function CandidateExtras({
  candidate,
  className = "",
  fields,
}: {
  candidate: object;
  className?: string;
  fields?: ExtraField[];
}) {
  const c = candidate as Extras;
  const allRows: { field: ExtraField; label: string; value: string }[] = [
    { field: "trained_on", label: "Trained on", value: clean(c.trained_on) },
    { field: "work_history", label: "Work history", value: clean(c.work_history) },
    { field: "proud_of", label: "Proud of", value: clean(c.proud_of) },
  ];
  const rows = allRows.filter(
    (row) => row.value && (!fields || fields.includes(row.field)),
  );

  if (rows.length === 0) return null;

  return (
    <dl className={`space-y-3 ${className}`}>
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {row.label}
          </dt>
          <dd className="demo-blur mt-0.5 break-words text-sm leading-6 text-foreground">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
