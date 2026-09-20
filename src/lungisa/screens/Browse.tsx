import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CandidateCard } from "../components/CandidateCard";
import {
  fetchCandidates,
  fetchDashboardShortlisted,
  type Candidate,
} from "../lib/dashboard";

export function Browse({
  onOpenCandidate,
}: {
  onOpenCandidate: (id: string) => void;
}) {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCandidates = async () => {
      if (!user) {
        setCandidates([]);
        setShortlistedIds(new Set());
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(false);

      try {
        const [candidatesData, shortlistedData] = await Promise.all([
          fetchCandidates(),
          fetchDashboardShortlisted(user),
        ]);

        if (cancelled) return;

        setCandidates(candidatesData);
        setShortlistedIds(
          new Set(shortlistedData.map(({ candidateId }) => candidateId)),
        );
      } catch (error) {
        console.error("Failed to load candidates:", error);

        if (cancelled) return;

        setCandidates([]);
        setShortlistedIds(new Set());
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
  }, [user]);

  const handleShortlistChanged = (
    candidateId: string,
    shortlisted: boolean,
  ) => {
    setShortlistedIds((current) => {
      const next = new Set(current);

      if (shortlisted) next.add(candidateId);
      else next.delete(candidateId);

      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-primary text-balance">
          Verified candidates
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Each person here has completed a structured assessment and a
          face-to-face interview with us.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          Loading candidates...
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-muted-foreground">
          We could not load candidates right now. Please try again shortly.
        </div>
      ) : (
        <div className="space-y-4">
          {candidates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
              No candidates available yet - we are vetting more this week.
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
              {candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  isShortlisted={shortlistedIds.has(candidate.id)}
                  onShortlistChanged={handleShortlistChanged}
                  onOpen={onOpenCandidate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
