type EmployerFields = {
  trained_on?: string | null;
  work_history?: string | null;
  proud_of?: string | null;
};

const fieldLabels = [
  ["trained_on", "Trained on"],
  ["work_history", "Work history"],
  ["proud_of", "Proud of"],
] as const;

export function CandidateEmployerFields({
  candidate,
}: {
  candidate: EmployerFields;
}) {
  const fields = fieldLabels.flatMap(([key, label]) => {
    const value = candidate[key]?.trim();
    return value ? [{ label, value }] : [];
  });

  if (fields.length === 0) return null;

  return (
    <dl className="mt-4 grid min-w-0 gap-3 text-sm">
      {fields.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="font-medium text-foreground">{label}</dt>
          <dd className="break-words text-muted-foreground [overflow-wrap:anywhere]">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
