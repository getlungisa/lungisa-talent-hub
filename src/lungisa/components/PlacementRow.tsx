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

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-xl text-primary">{name}</h3>
          <p className="text-sm text-muted-foreground">
            {role} · started {startDate}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-primary">
            Day <span className="font-display text-lg">{day}</span> of {total}
          </div>
          <div className={`text-xs ${dueAtEnd ? "text-accent" : "text-muted-foreground"}`}>
            {dueAtEnd ? "Placement fee due" : `Fee due at day ${total}`}
          </div>
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}