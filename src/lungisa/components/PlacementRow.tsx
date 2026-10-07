export function PlacementRow({
  name,
  role,
  day,
  total,
  startDate,
}: {
  name: string;
  role: string;
  day: number;
  total: number;
  startDate: string;
}) {
  const pct = Math.min(100, (day / total) * 100);
  const dueAtEnd = day >= total;
  const isDay90Milestone = total === 90;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words font-display text-xl text-foreground">{name}</h3>
          <p className="text-sm text-muted-foreground">
            {role} · started {startDate}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-foreground">
            Day <span className="font-display text-lg">{day}</span> of {total}
          </div>
          <div className="text-xs text-muted-foreground">
            {dueAtEnd ? "Placement complete" : isDay90Milestone ? `Day ${total} milestone` : "In progress"}
          </div>
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}