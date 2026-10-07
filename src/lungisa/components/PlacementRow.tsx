import { Seam } from "./Seam";

export function PlacementRow({
  name,
  role,
  startedDaysAgo,
  startedAt,
  startDate,
}: {
  name: string;
  role: string;
  startedDaysAgo: number;
  startedAt?: string | null;
  startDate: string;
}) {
  const firstName = name.trim().split(/\s+/)[0] ?? "";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="min-w-0">
        <h3 className="break-words font-display text-xl text-foreground">{name}</h3>
        <p className="text-sm text-muted-foreground">
          {role} · started {startDate}
        </p>
      </div>

      <div className="mt-4">
        <Seam
          startedDaysAgo={startedDaysAgo}
          startedAt={startedAt}
          firstName={firstName}
        />
      </div>
    </div>
  );
}
