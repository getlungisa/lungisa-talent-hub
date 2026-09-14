import { useEffect, useState, useCallback } from "react";
import { useLungisa } from "../store";
import { PlacementRow } from "../components/PlacementRow";
import { Avatar } from "../components/Avatar";
import { RecommendedRow } from "../components/RecommendedRow";
import { ArrowRight, Heart, Sparkles, Check, Clock } from "lucide-react";
import { NeedSheet } from "../components/NeedSheet";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOpenNeeds, relativeTime, formatStatus, type Need } from "../lib/needs";
import {
  fetchDashboardPlacements,
  fetchDashboardShortlisted,
  type DashboardPlacement,
  type DashboardShortlistedCandidate,
} from "../lib/dashboard";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function Dashboard({
  onOpenCandidate,
  onBrowse,
}: {
  onOpenCandidate: (id: string) => void;
  onBrowse: () => void;
}) {
  const {
    employerName,
    requested,
    requestInterview,
    newThisWeek,
  } = useLungisa();

  const { user } = useAuth();
  const [needSheetOpen, setNeedSheetOpen] = useState(false);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [placements, setPlacements] = useState<DashboardPlacement[]>([]);
  const [shortlisted, setShortlisted] = useState<DashboardShortlistedCandidate[]>([]);

  const loadNeeds = useCallback(async () => {
    if (!user) {
      setNeeds([]);
      return;
    }
    const data = await fetchOpenNeeds(user);
    setNeeds(data);
  }, [user]);

  useEffect(() => {
    loadNeeds();
  }, [loadNeeds]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (!user) {
          setPlacements([]);
          setShortlisted([]);
          return;
        }

        const [placementsData, shortlistedData] = await Promise.all([
          fetchDashboardPlacements(user),
          fetchDashboardShortlisted(user),
        ]);

        if (cancelled) return;
        setPlacements(placementsData);
        setShortlisted(shortlistedData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        if (cancelled) return;
        setPlacements([]);
        setShortlisted([]);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="space-y-12">
      <section className="flex flex-col items-center pt-4 text-center sm:pt-8">
        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
          {greeting()}
        </p>
        <h1 className="mt-2 font-display text-4xl text-primary text-balance sm:text-5xl">
          {employerName}
        </h1>

        <p className="mt-6 max-w-md font-display text-xl text-primary text-balance sm:text-2xl">
          Tell us who you need. We'll bring them to you.
        </p>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => setNeedSheetOpen(true)}
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-9 py-5 text-lg font-medium text-accent-foreground shadow-[0_14px_36px_-12px_hsl(19_63%_44%/0.55)] transition h[...]"
          >
            I need someone
            <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
          </button>

          <button
            onClick={onBrowse}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-transparent px-9 py-5 text-lg font-medium text-primary transition hover:border-accent hover:text-accent s[...]"
          >
            Browse candidates
          </button>
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
          <span>
            <span className="font-medium text-primary">{newThisWeek} new candidates</span>{" "}
            verified this week
          </span>
        </div>
      </section>

      {needs.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-2xl text-primary">Open needs</h2>
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {needs.length} open
            </span>
          </div>
          <div className="space-y-3">
            {needs.map((n) => (
              <article
                key={n.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg text-primary">{n.role}</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                      {formatStatus(n.status)}
                    </span>
                  </div>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {n.timing}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {relativeTime(n.created_at)}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      <RecommendedRow onOpenCandidate={onOpenCandidate} onSeeAll={onBrowse} />

      {/* Active placements */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-primary">Active placements</h2>
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {placements.length} active
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

     {/* Shortlist */}
<section>
  <div className="mb-3 flex items-baseline justify-between">
    <h2 className="font-display text-2xl text-primary">Shortlist</h2>
    <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
      {shortlisted.length} saved
    </span>
  </div>

  {shortlisted.length === 0 ? (
    <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
      You have no shortlisted candidates yet.
    </p>
  ) : (
    <div className="space-y-3">
      {shortlisted.map((candidate) => (
        <article
          key={candidate.candidateId}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5"
        >
          <Avatar name={candidate.candidateName} />
          <div className="min-w-0">
            <h3 className="font-display text-lg text-primary">
              {candidate.candidateName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {candidate.location ?? "Location not provided"}
            </p>
          </div>
        </article>
      ))}
    </div>
  )}
</section>

      <NeedSheet
        open={needSheetOpen}
        onOpenChange={setNeedSheetOpen}
        onSubmitted={loadNeeds}
      />
    </div>
  );
}
