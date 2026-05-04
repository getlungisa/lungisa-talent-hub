import { useLungisa } from "../store";
import { candidates } from "../data";
import { CandidateCard } from "../components/CandidateCard";
import { PlacementRow } from "../components/PlacementRow";
import { ArrowRight, Plus } from "lucide-react";
import { useState } from "react";
import { TopUpModal } from "../components/TopUpModal";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function Dashboard({ onOpenCandidate, onBrowse }: { onOpenCandidate: (id: string) => void; onBrowse: () => void }) {
  const { credits, employerName, stats, placements } = useLungisa();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const suggested = candidates.slice(1, 3);

  return (
    <div className="space-y-10">
      <section>
        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
          {greeting()}
        </p>
        <h1 className="mt-2 font-display text-4xl text-primary text-balance sm:text-5xl">
          {employerName}
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          A small, considered roster of verified candidates ready to meet you. We do the vetting; you choose who to interview.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5 sm:col-span-1">
          <div className="text-xs uppercase tracking-[0.14em] text-accent">Credits</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl text-primary">{credits}</span>
            <span className="text-sm text-muted-foreground">interview credits remaining</span>
          </div>
          <button
            onClick={() => setTopUpOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-foreground transition hover:brightness-95"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Top up credits
          </button>
        </div>

        <Stat label="Candidates browsed" value={stats.browsed} note="this month" />
        <Stat label="Interviews requested" value={stats.interviews} note="this month" />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-primary">Active placement</h2>
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {stats.placements} active
          </span>
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
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-primary">Suggested for you</h2>
          <button
            onClick={onBrowse}
            className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
          >
            Browse all candidates <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {suggested.map((c) => (
            <CandidateCard key={c.id} candidate={c} onOpen={onOpenCandidate} />
          ))}
        </div>
      </section>

      <p className="border-t border-border pt-6 text-sm text-muted-foreground text-balance">
        Lungisa stays in touch with all placed candidates. You will hear from us if anything needs attention.
      </p>

      <TopUpModal open={topUpOpen} onOpenChange={setTopUpOpen} />
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