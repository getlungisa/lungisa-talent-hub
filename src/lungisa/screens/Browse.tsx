import { useEffect, useState } from "react";
import { CandidateCard } from "../components/CandidateCard";
import { fetchCandidates, type Candidate } from "../lib/dashboard";
import { candidates as mockCandidates } from "../data";

export function Browse({ onOpenCandidate }: { onOpenCandidate: (id: string) => void }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const displayCandidates = candidates.length > 0 ? candidates : mockCandidates;

  useEffect(() => {
    let cancelled = false;

    const loadCandidates = async () => {
      setLoading(true);
      setLoadError(false);

      try {
        const data = await fetchCandidates();
        if (cancelled) return;
        setCandidates(data);
      } catch (error) {
        console.error("Failed to load candidates:", error);
        if (cancelled) return;
        setCandidates([]);
        setLoadError(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCandidates();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-primary text-balance">Verified candidates</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Each person here has completed a structured assessment and a face-to-face interview with us.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          Loading candidates...
        </div>
      ) : (
        <div className="space-y-4">
          {loadError && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-muted-foreground">
              We could not load candidates right now. Showing saved example profiles instead.
            </div>
          )}
          {displayCandidates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
              No candidates available yet - we are vetting more this week.
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
              {displayCandidates.map((c) => (
                <CandidateCard key={c.id} candidate={c} onOpen={onOpenCandidate} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
