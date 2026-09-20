import { useEffect, useState } from "react";
import { roleFilters } from "../data";
import { CandidateCard } from "../components/CandidateCard";
import { fetchCandidates, type BrowseCandidate } from "../lib/candidates";

export function Browse({ onOpenCandidate }: { onOpenCandidate: (id: string) => void }) {
  const [filter, setFilter] = useState<(typeof roleFilters)[number]>("All roles");
  const [candidates, setCandidates] = useState<BrowseCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCandidates = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchCandidates();

        if (cancelled) return;
        setCandidates(data);
      } catch (err) {
        console.error("Failed to load candidates:", err);

        if (cancelled) return;
        setCandidates([]);
        setError("We couldn't load verified candidates right now. Please try again in a moment.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadCandidates();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = filter === "All roles" ? candidates : candidates.filter((candidate) => candidate.role === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-primary text-balance">Verified candidates</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Each person here has completed a structured assessment and a face-to-face interview with us.
        </p>
      </div>

      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className="flex gap-2 pb-1">
          {roleFilters.map((r) => {
            const active = r === filter;
            return (
              <button
                key={r}
                onClick={() => setFilter(r)}
                className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-primary hover:border-accent hover:text-accent"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          Loading candidates...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          No candidates in this role yet - we are vetting more this week.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          {filtered.map((c) => (
            <CandidateCard key={c.id} candidate={c} onOpen={onOpenCandidate} />
          ))}
        </div>
      )}
    </div>
  );
}
