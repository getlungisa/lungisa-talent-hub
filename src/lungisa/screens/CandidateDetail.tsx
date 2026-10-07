import { useEffect, useRef, useState } from "react";
import { Avatar } from "../components/Avatar";
import { createPortal } from "react-dom";
import {
  fetchCandidate,
  fetchDashboardShortlisted,
  fetchInterviewRequestedCandidateIds,
  insertBusinessActivity,
  toggleCandidateShortlist,
  type Candidate,
} from "../lib/dashboard";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  Check,
  Heart,
  MapPin,
} from "lucide-react";

export function CandidateDetail({
  id,
  onBack,
  onCandidateStatusChange,
  onInterviewRequestedChange,
  onInterviewRequested,
  isTrainingPartner = false
}: {
  id: string;
  onBack: () => void;
  onCandidateStatusChange?: (exists: boolean | null) => void;
  onInterviewRequestedChange?: (requested: boolean) => void;
  onInterviewRequested?: (candidateId: string) => Promise<boolean>;
  isTrainingPartner?: boolean;
}) {

  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isUpdatingSave, setIsUpdatingSave] = useState(false);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isInterviewRequested, setIsInterviewRequested] = useState(false);
  const viewedCandidateIdRef = useRef<string | null>(null);

  useEffect(() => {
    const candidateId = candidate?.id;

    if (
      !user ||
      !candidateId ||
      viewedCandidateIdRef.current === candidateId
    ) {
      return;
    }

    viewedCandidateIdRef.current = candidateId;

    void insertBusinessActivity(user, candidateId, "candidate_viewed");
  }, [user, candidate?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadInterviewStatus = async () => {
      if (!user || !id) {
        if (!cancelled) {
          setIsInterviewRequested(false);
          onInterviewRequestedChange?.(false);
        }
        return;
      }

      const requestedCandidateIds = await fetchInterviewRequestedCandidateIds(user);

      if (!cancelled) {
        const requested = requestedCandidateIds.has(id);
        setIsInterviewRequested(requested);
        onInterviewRequestedChange?.(requested);
      }
    };

    void loadInterviewStatus();

    return () => {
      cancelled = true;
    };
  }, [user, id, onInterviewRequestedChange]);

  useEffect(() => {
    let cancelled = false;

    const loadSaved = async () => {
      if (!user || !id || isTrainingPartner) {
        setIsSaved(false);
        return;
      }

      try {
        const shortlisted = await fetchDashboardShortlisted(user);
        if (!cancelled) {
          setIsSaved(shortlisted.some(({ candidateId }) => candidateId === id));
        }
      } catch (error) {
        console.error("Failed to load shortlist state:", error);
      }
    };

    void loadSaved();

    return () => {
      cancelled = true;
    };
  }, [user, id, isTrainingPartner]);

  const handleSaveClick = async () => {
    if (!user || isUpdatingSave) return;

    setIsUpdatingSave(true);

    try {
      setIsSaved(await toggleCandidateShortlist(user, id, isSaved));
    } catch (error) {
      console.error("Failed to update shortlist:", error);
    } finally {
      setIsUpdatingSave(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadCandidate = async () => {
      setLoading(true);
      setLoadError(false);
      onCandidateStatusChange?.(null);

      try {
        const nextCandidate = await fetchCandidate(id);
        if (cancelled) return;
        setCandidate(nextCandidate);
        onCandidateStatusChange?.(Boolean(nextCandidate));
      } catch (error) {
        console.error("Failed to load candidate:", error);
        if (cancelled) return;
        setCandidate(null);
        setLoadError(true);
        onCandidateStatusChange?.(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCandidate();

    return () => {
      cancelled = true;
    };
  }, [id, onCandidateStatusChange]);

  if (loadError) {
    return (
      <div className="space-y-6 pb-28">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
        </button>
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          We could not load this candidate right now. Please try again shortly.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-28">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
        </button>
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Loading candidate...
        </div>
      </div>
    );
  }

  const strengthsSummary = candidate?.strengths_summary?.trim() ?? "";
  const referenceNote = candidate?.reference_note?.trim() ?? "";

  return (
    <div className="space-y-6 pb-28">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
      </button>

      {!candidate ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Candidate not found.
        </div>
      ) : (
        <>
          <header className="space-y-1.5">
            <div className="flex items-center gap-3">
              <Avatar name={candidate.name} size={48} />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <h1 className="break-words font-display text-3xl text-foreground">
                  {candidate.name}
                </h1>
              </div>
            </div>
            <div className="pl-[60px]">
              <p className="text-sm text-muted-foreground">
                {candidate.location ?? "Location not provided"}
              </p>
            </div>
          </header>

          <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-8">
              <div>
                <dl className="grid gap-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
                    <div className="min-w-0">
                      <dd className="text-[15px] text-foreground">
                        {candidate.location ?? "Location not provided"}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>
              {referenceNote && (
                <p className="text-sm text-foreground">
                  Reference: {referenceNote}
                </p>
              )}
              
              {strengthsSummary && (
                <div>
                  <h2 className="font-display text-xl text-foreground">
                    What stood out
                  </h2>
                  <p className="mt-2 text-[15px] leading-7 text-foreground">
                    {strengthsSummary}
                  </p>
                  {candidate.training_partner?.name && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Based on {candidate.training_partner.name}'s trainer
                      assessment
                    </p>
                  )}
                </div>
              )}
            </div>

            {!isTrainingPartner && (
              <aside className="lg:sticky lg:top-32 lg:self-start">
                <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
                  <div className="space-y-2">
                    <button
                      onClick={async () => {
                        if (!isInterviewRequested) {
                          await onInterviewRequested?.(id);
                        }
                      }}
                      disabled={isInterviewRequested || !onInterviewRequested}
                      className={`inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition ${
                        isInterviewRequested
                          ? "bg-primary-tint text-primary"
                          : "bg-primary text-primary-foreground hover:bg-primary-hover"
                      }`}
                    >
                      {isInterviewRequested ? (
                        <>
                          <Check className="h-4 w-4" strokeWidth={3} />
                          Interview requested
                        </>
                      ) : (
                        "Request interview"
                      )}
                    </button>
                    <button
                      onClick={handleSaveClick}
                      disabled={isUpdatingSave}
                      className={`inline-flex w-full items-center justify-center gap-1.5 px-4 py-2 text-sm transition hover:opacity-70 ${
                        isSaved ? "text-primary" : "text-foreground"
                      }`}
                    >
                      <Heart
                        className="h-4 w-4"
                        strokeWidth={2}
                        fill={isSaved ? "currentColor" : "none"}
                      />
                      {isSaved ? "Saved to shortlist" : "Save to shortlist"}
                    </button>
                  </div>

                  <div>
                    <h2 className="font-display text-base text-foreground">
                      What happens next
                    </h2>
                    <p className="mt-1 text-sm text-foreground">
                      {isInterviewRequested
                        ? "Interview requested, we'll be in touch within 24 hours."
                        : "We'll arrange a time that suits you both, usually within 24 hours. Interviews are free during the pilot."}
                    </p>
                  </div>

                  <p className="text-sm text-foreground">
                    R1,000 on hire. R3,000 at day 90, only if they're still with
                    you.
                  </p>
                </div>
              </aside>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function CandidateInterviewBar({
  id,
  candidateExists,
  isTrainingPartner = false,
  isRequested,
  onInterviewRequested,
}: {
  id: string;
  candidateExists: boolean | null;
  isTrainingPartner?: boolean;
  isRequested: boolean;
  onInterviewRequested: (candidateId: string) => Promise<boolean>;
}) {
  if (
    typeof document === "undefined" ||
    candidateExists !== true ||
    isTrainingPartner
  ) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-[100] border-t lg:hidden border-border bg-background"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))",
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        willChange: "transform",
      }}
    >
      <div className="mx-auto max-w-6xl px-5 pt-3.5">
        <button
          onClick={async () => {
            if (!isRequested) {
              await onInterviewRequested(id);
            }
          }}
          disabled={isRequested}
          className={`inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
            isRequested ? "bg-primary-tint text-primary" : "bg-primary text-primary-foreground hover:bg-primary-hover"
          }`}
        >
          {isRequested ? (
            <>
              <Check className="h-4 w-4" strokeWidth={3} /> Interview requested
            </>
          ) : (
            "Request interview"
          )}
        </button>
      </div>
    </div>,
    document.body,
  );
}
