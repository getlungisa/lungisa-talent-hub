import { useCallback, useEffect, useState } from "react";
import { useLungisa } from "../store";
import { PlacementRow } from "../components/PlacementRow";
import { Avatar } from "../components/Avatar";
import { RecommendedRow } from "../components/RecommendedRow";
import { Clock } from "lucide-react";
import { NeedSheet } from "../components/NeedSheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchOpenNeeds,
  relativeTime,
  formatStatus,
  type Need,
} from "../lib/needs";
import {
  fetchDashboardPlacements,
  fetchDashboardShortlisted,
  fetchInterviewRequestedCandidateIds,
  fetchTrainingPartnerCandidates,
  toggleCandidateShortlist,
  type Candidate,
  type DashboardPlacement,
  type DashboardShortlistedCandidate,
  fetchNewCandidatesThisWeekCount,
  type TrainingPartnerCandidate,
} from "../lib/dashboard";
import { isPlaceholderBusinessName } from "../lib/businessName";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function Dashboard({
  isTrainingPartner,
  onOpenCandidate,
  onBrowse,
}: {
  isTrainingPartner: boolean | null;
  onOpenCandidate: (
    candidate: Candidate | string,
    isTrainingPartner?: boolean,
  ) => void;
  onBrowse: () => void;
}) {
  const { employerName, requested, requestInterview } =
    useLungisa();
  const { user } = useAuth();
  const [needSheetOpen, setNeedSheetOpen] = useState(false);
  const [newThisWeek, setNewThisWeek] = useState(0);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [placements, setPlacements] = useState<DashboardPlacement[]>([]);
  const [isFirstTimeState, setIsFirstTimeState] = useState(false);
  const [shortlisted, setShortlisted] = useState<
    DashboardShortlistedCandidate[]
  >([]);
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(
    new Set(),
  );
  const [trainingPartnerCandidates, setTrainingPartnerCandidates] = useState<
    TrainingPartnerCandidate[]
  >([]);

  const loadNeeds = useCallback(async () => {
    if (!user) {
      setNeeds([]);
      return;
    }

    const data = await fetchOpenNeeds(user);
    setNeeds(data);
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsFirstTimeState(false);

      try {
        if (!user) {
          setTrainingPartnerCandidates([]);
          setPlacements([]);
          setShortlisted([]);
          setShortlistedIds(new Set());
          return;
        }

        if (isTrainingPartner === null) {
          setTrainingPartnerCandidates([]);
          setPlacements([]);
          setShortlisted([]);
          setShortlistedIds(new Set());
          return;
        }

        if (isTrainingPartner) {
          const candidates = await fetchTrainingPartnerCandidates(user);

          if (cancelled) return;

          setTrainingPartnerCandidates(candidates);
          setPlacements([]);
          setShortlisted([]);
          setShortlistedIds(new Set());
          return;
        }

        setTrainingPartnerCandidates([]);

        const [placementsData, shortlistedData, interviewRequestedData] =
          await Promise.all([
            fetchDashboardPlacements(user, true),
            fetchDashboardShortlisted(user, true),
            fetchInterviewRequestedCandidateIds(user, true),
          ]);

        if (cancelled) return;

        setPlacements(placementsData);
        setShortlisted(shortlistedData);
        setShortlistedIds(
          new Set(shortlistedData.map(({ candidateId }) => candidateId)),
        );
        setIsFirstTimeState(
          placementsData.length === 0 &&
            shortlistedData.length === 0 &&
            interviewRequestedData.size === 0,
        );
      } catch (error) {
        console.error("Failed to load dashboard data:", error);

        if (cancelled) return;

        setTrainingPartnerCandidates([]);
        setPlacements([]);
        setShortlisted([]);
        setShortlistedIds(new Set());
        setIsFirstTimeState(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isTrainingPartner, user]);

  useEffect(() => {
    let cancelled = false;

    const loadNewCandidatesCount = async () => {
      const count = await fetchNewCandidatesThisWeekCount();

      if (!cancelled) {
        setNewThisWeek(count);
      }
    };

    void loadNewCandidatesCount();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleShortlistChanged = useCallback(
    (candidateId: string, isShortlisted: boolean) => {
      setIsFirstTimeState(false);
      setShortlistedIds((current) => {
        const next = new Set(current);
        if (isShortlisted) next.add(candidateId);
        else next.delete(candidateId);
        return next;
      });

      setShortlisted((current) => {
        if (isShortlisted) return current;
        return current.filter(
          (candidate) => candidate.candidateId !== candidateId,
        );
      });
    },
    [],
  );

  const displayBusinessName = isPlaceholderBusinessName(employerName)
    ? null
    : employerName;

  if (isTrainingPartner === null) {
    return (
      <div className="space-y-8">
        <section className="pt-4 sm:pt-8">
          <p className="text-sm text-muted-foreground">
            {greeting()}
          </p>
          {displayBusinessName && (
            <h1 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.01em] text-foreground text-balance sm:text-[32px]">
              {displayBusinessName}
            </h1>
          )}
          <p className="mt-4 max-w-xl text-muted-foreground">
            Loading dashboard...
          </p>
        </section>
      </div>
    );
  }

  if (isTrainingPartner === true) {
    return (
      <div className="space-y-8">
        <section className="pt-4 sm:pt-8">
          <p className="text-sm text-muted-foreground">
            {greeting()}
          </p>
          {displayBusinessName && (
            <h1 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.01em] text-foreground text-balance sm:text-[32px]">
              {displayBusinessName}
            </h1>
          )}
          <p className="mt-4 max-w-xl text-muted-foreground">
            Candidates connected to your training partner program.
          </p>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-2xl text-foreground">Candidates</h2>
            <span className="text-sm text-muted-foreground">
              {trainingPartnerCandidates.length} {trainingPartnerCandidates.length === 1 ? "candidate" : "candidates"}
            </span>
          </div>

          {trainingPartnerCandidates.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              No candidates are currently linked to your training partner account.
            </p>
          ) : (
            <div className="space-y-3">
              {trainingPartnerCandidates.map((candidate) => {
                let statusLabel: string;

                switch (candidate.status) {
                  case "placed":
                    statusLabel = candidate.businessName
                      ? `Placed with ${candidate.businessName}`
                      : "Placed";
                    break;
                  case "confirmed":
                    statusLabel = candidate.businessName
                      ? `Confirmed with ${candidate.businessName}`
                      : "Confirmed";
                    break;
                  default:
                    statusLabel = "Available";
                }

                return (
                  <article
                    key={candidate.id}
                    onClick={() =>
                      onOpenCandidate(
                        {
                          id: candidate.id,
                          name: candidate.name,
                          location: candidate.location,
                        },
                        true,
                      )
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-5"
                  >
                    <Avatar name={candidate.name} />

                    <div className="min-w-0">
                      <h3 className="break-words font-display text-lg text-foreground">
                        {candidate.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {candidate.location ?? "Location not provided"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {statusLabel}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section className="pt-4 sm:pt-8">
        <div
          data-testid="dashboard-hero"
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="font-display text-[28px] font-semibold tracking-[-0.01em] text-foreground sm:text-[32px]">
              {greeting()}
              {displayBusinessName ? `, ${displayBusinessName}` : ""}
            </h1>

            {placements.length > 0 && (
              <p className="mt-2 text-sm text-foreground">
                {placements.length}{" "}
                {placements.length === 1 ? "placement" : "placements"} in
                progress
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => setNeedSheetOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
            >
              I need someone
            </button>

            <button
              onClick={onBrowse}
              className="inline-flex items-center justify-center gap-1.5 border border-input bg-transparent px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-primary-tint"
            >
              Browse candidates
            </button>
          </div>
        </div>
      </section>

      {needs.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-2xl text-foreground">Open needs</h2>
            <span className="text-sm text-muted-foreground">
              {needs.length} open {needs.length === 1 ? "need" : "needs"}
            </span>
          </div>
          <div className="space-y-3">
            {needs.map((need) => (
              <article
                key={need.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="break-words font-display text-lg text-foreground">
                      {need.role}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-tint px-2.5 py-0.5 text-xs font-medium text-primary">
                      {formatStatus(need.status)}
                    </span>
                  </div>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {need.timing}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {relativeTime(need.created_at)}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      {placements.length > 0 && (
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold text-foreground">Placements</h2>
          <span className="text-sm text-muted-foreground">
            {placements.length} {placements.length === 1 ? "placement" : "placements"}
          </span>
        </div>
        <div className="space-y-3">
          {placements.map((placement) => (
            <PlacementRow
              key={placement.candidateId}
              name={placement.candidateName}
              role={placement.location ?? "Location not provided"}
              startedDaysAgo={placement.startedDaysAgo}
              startedAt={placement.startedAt}
              startDate={`${placement.startedDaysAgo} days ago`}
            />
          ))}
        </div>
      </section>
      )}

      {isFirstTimeState && (
        <section aria-label="How it works" className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            How it works
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <p>
              Browse. Every candidate is vouched for by the people who trained
              them. Read what stood out, then save anyone you'd like to meet.
            </p>
            <p>
              Meet. Ask for an interview and we'll arrange a time that works for
              you both, usually within 24 hours.
            </p>
            <p>
              Hire, with support. We check in with you and your new team member
              through the first 90 days. R1,000 on hire. R3,000 at day 90, only
              if they're still with you.
            </p>
          </div>
        </section>
      )}

      <RecommendedRow
        onOpenCandidate={onOpenCandidate}
        onSeeAll={onBrowse}
        newThisWeek={newThisWeek}
        shortlistedIds={shortlistedIds}
        placedCandidateIds={new Set(placements.map((p) => p.candidateId))}
        onShortlistChanged={handleShortlistChanged}
      />

      {!isFirstTimeState && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold text-foreground">Shortlist</h2>
            <span className="text-sm text-muted-foreground">
              {shortlisted.length} {shortlisted.length === 1 ? "candidate" : "candidates"}
            </span>
          </div>
          {shortlisted.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              You have no shortlisted candidates yet.
            </p>
          ) : (
            <div className="space-y-3">
              {shortlisted.map((candidate) => (
                candidate.isAvailable && candidate.candidateName ? (
                  <article
                    key={candidate.candidateId}
                    onClick={() =>
                      onOpenCandidate({
                        id: candidate.candidateId,
                        name: candidate.candidateName,
                        location: candidate.location,
                      })
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-5"
                  >
                    <Avatar name={candidate.candidateName} />
                    <div className="min-w-0">
                      <h3 className="font-display text-lg text-foreground">
                        {candidate.candidateName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {candidate.location ?? "Location not provided"}
                      </p>
                    </div>
                  </article>
                ) : (
                  <article
                    key={candidate.candidateId}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5"
                  >
                    <p className="text-sm text-muted-foreground">
                      No longer available
                    </p>
                    <button
                      type="button"
                      aria-label="Remove unavailable candidate from shortlist"
                      onClick={async () => {
                        if (!user) return;

                        try {
                          await toggleCandidateShortlist(
                            user,
                            candidate.candidateId,
                            true,
                          );
                          handleShortlistChanged(candidate.candidateId, false);
                        } catch (error) {
                          console.error(
                            "Failed to remove unavailable candidate from shortlist:",
                            error,
                          );
                        }
                      }}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Remove
                    </button>
                  </article>
                )
              ))}
            </div>
          )}
        </section>
      )}

      <NeedSheet
        open={needSheetOpen}
        onOpenChange={setNeedSheetOpen}
        onSubmitted={loadNeeds}
      />
    </div>
  );
}
