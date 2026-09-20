import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  fetchCandidates,
  toggleCandidateShortlist,
  type Candidate,
} from "../lib/dashboard";
import { Avatar } from "./Avatar";
import { Heart, ArrowRight } from "lucide-react";

const shortlistConflictTitle = "Candidate no longer available";
const shortlistConflictDescription =
  "Another business shortlisted this candidate first. The candidate was not added to your shortlist.";
const shortlistErrorTitle = "Couldn't update shortlist";
const shortlistErrorDescription = "Please try again.";

export function RecommendedRow({
  onOpenCandidate,
  onSeeAll,
  shortlistedIds,
  onShortlistChanged,
}: {
  onOpenCandidate: (candidate: Candidate) => void;
  onSeeAll: () => void;
  shortlistedIds: Set<string>;
  onShortlistChanged: (candidateId: string, shortlisted: boolean) => void;
}) {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const shortlistRequestsInFlight = useRef<Set<string>>(new Set());
  const [pendingShortlistIds, setPendingShortlistIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    let cancelled = false;

    const loadCandidates = async () => {
      setLoading(true);

      try {
        const data = await fetchCandidates();

        if (cancelled) return;
        setCandidates(data);
      } catch (error) {
        console.error("Failed to load recommended candidates:", error);

        if (cancelled) return;
        setCandidates([]);
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

  const recommended = candidates.slice(0, 3);

  const handleShortlistClick = async (
    event: MouseEvent<HTMLButtonElement>,
    candidate: Candidate,
  ) => {
    event.stopPropagation();

    if (shortlistRequestsInFlight.current.has(candidate.id)) return;

    if (!user) {
      toast.error(shortlistErrorTitle, {
        description: shortlistErrorDescription,
      });
      return;
    }

    shortlistRequestsInFlight.current.add(candidate.id);
    setPendingShortlistIds((current) => {
      const next = new Set(current);
      next.add(candidate.id);
      return next;
    });

    const isSaved = shortlistedIds.has(candidate.id);

    try {
      const nextShortlisted = await toggleCandidateShortlist(
        user,
        candidate.id,
        isSaved,
      );

      onShortlistChanged(candidate.id, nextShortlisted);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "candidate_already_claimed"
      ) {
        toast.error(shortlistConflictTitle, {
          description: shortlistConflictDescription,
        });
      } else {
        toast.error(shortlistErrorTitle, {
          description: shortlistErrorDescription,
        });
      }
    } finally {
      shortlistRequestsInFlight.current.delete(candidate.id);
      setPendingShortlistIds((current) => {
        const next = new Set(current);
        next.delete(candidate.id);
        return next;
      });
    }
  };

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Recommended for you
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
          Loading recommendations...
        </div>
      ) : recommended.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
          No candidates available yet.
        </div>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <div className="flex gap-4 pb-2">
            {recommended.map((candidate) => {
              const isSaved = shortlistedIds.has(candidate.id);
              const isPending = pendingShortlistIds.has(candidate.id);

              return (
                <article
                  key={candidate.id}
                  onClick={() => onOpenCandidate(candidate)}
                  className="group flex w-[220px] shrink-0 cursor-pointer flex-col rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_8px_30px_-12px_hsl(22_47%_11%/0.12)]"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={candidate.name} />
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-lg leading-tight text-primary">
                          {candidate.name}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {candidate.location ?? "Location not provided"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-primary/80">
                      {candidate.location ?? "Location not provided"}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs font-medium text-accent group-hover:underline">
                      View profile
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-accent transition group-hover:translate-x-0.5" />
                  </div>

                  <div className="mt-3 flex justify-center">
                    <button
                      onClick={(event) =>
                        handleShortlistClick(event, candidate)
                      }
                      disabled={isPending}
                      aria-label={
                        isSaved
                          ? "Remove from shortlist"
                          : "Save to shortlist"
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] transition hover:opacity-70 ${
                        isSaved ? "text-accent" : "text-muted-foreground"
                      }`}
                    >
                      <Heart
                        className="h-3.5 w-3.5"
                        strokeWidth={2}
                        fill={isSaved ? "currentColor" : "none"}
                      />
                      {isSaved
                        ? "Saved to shortlist"
                        : "Save to shortlist"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <button
          onClick={onSeeAll}
          className="text-xs text-muted-foreground transition hover:text-accent"
        >
          See all candidates →
        </button>
      </div>
    </section>
  );
}
