import { useLungisa } from "../store";
import { candidates } from "../data";
import { Avatar } from "../components/Avatar";
import { Check } from "lucide-react";

export function Activity() {
  const { stats, requested } = useLungisa();
  const requestedCandidates = candidates.filter((c) => requested.has(c.id));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-4xl text-primary text-balance">Activity</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          A quiet record of what you have done on Lungisa this month.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Candidates browsed" value={stats.browsed} note="this month" />
        <Stat label="Interviews requested" value={stats.interviews} note="this month" />
        <Stat label="Active placements" value={stats.placements} note="ongoing" />
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl text-primary">Interviews requested</h2>
        {requestedCandidates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No interviews requested yet. Browse candidates to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {requestedCandidates.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={c.firstName} />
                  <div>
                    <div className="font-display text-lg text-primary">{c.firstName}</div>
                    <div className="text-sm text-muted-foreground">{c.role}</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success">
                  <Check className="h-3 w-3" strokeWidth={3} /> Requested
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-4xl text-primary">{value}</span>
        <span className="text-sm text-muted-foreground">{note}</span>
      </div>
    </div>
  );
}
