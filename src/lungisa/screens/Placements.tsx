import { useLungisa } from "../store";
import { PlacementRow } from "../components/PlacementRow";

export function Placements() {
  const { placements } = useLungisa();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-primary text-balance">Active placements</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          A clear view of everyone you have placed through Lungisa, and where they are in their first thirty days.
        </p>
      </div>

      <div className="space-y-3">
        {placements.map((p) => (
          <PlacementRow
            key={p.candidateId}
            name={p.candidateName}
            role={p.role}
            day={p.startedDaysAgo}
            total={p.totalDays}
            startDate={`${p.startedDaysAgo} days ago`}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-accent-soft/40 p-5 text-sm text-primary/80">
        Lungisa stays close to every placed candidate. You will hear from us if anything needs attention.
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        <span className="font-medium text-primary">A note on fees.</span> Your placement fee becomes due on day 30. We will send a single, plain invoice - no surprises.
      </div>
    </div>
  );
}