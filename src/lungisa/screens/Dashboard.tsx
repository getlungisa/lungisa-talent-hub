import { useLungisa } from "../store";
import { candidates } from "../data";
import { PlacementRow } from "../components/PlacementRow";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { RecommendedRow } from "../components/RecommendedRow";
import { ArrowRight, Heart, Sparkles, Check } from "lucide-react";

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
    placements,
    shortlist,
    toggleShortlist,
    requested,
    requestInterview,
    credits,
    newThisWeek,
  } = useLungisa();

  const shortlisted = candidates.filter((c) => shortlist.has(c.id));

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
            onClick={() => console.log("I need someone clicked")}
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-9 py-5 text-lg font-medium text-accent-foreground shadow-[0_14px_36px_-12px_hsl(19_63%_44%/0.55)] transition hover:brightness-95 sm:text-xl"
          >
            I need someone
            <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
          </button>

          <button
            onClick={onBrowse}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-transparent px-9 py-5 text-lg font-medium text-primary transition hover:border-accent hover:text-accent sm:text-xl"
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
          <h2 className="font-display text-2xl text-primary">Your shortlist</h2>
          {shortlisted.length > 0 && (
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {shortlisted.length} saved
            </span>
          )}
        </div>

        {shortlisted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Heart className="mx-auto h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
            <p className="mt-3 text-sm text-muted-foreground text-balance">
              Favourite candidates while browsing to save them here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shortlisted.map((c) => {
              const isRequested = requested.has(c.id);
              return (
                <article
                  key={c.id}
                  className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-accent/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <button
                    onClick={() => onOpenCandidate(c.id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <Avatar name={c.firstName} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg text-primary">{c.firstName}</h3>
                        {c.verified && <VerifiedBadge />}
                      </div>
                      <p className="text-sm text-muted-foreground">{c.role}</p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleShortlist(c.id)}
                      aria-label="Remove from shortlist"
                      className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-background px-3 text-xs text-muted-foreground transition hover:border-accent hover:text-accent"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => !isRequested && requestInterview(c.id)}
                      disabled={isRequested || credits <= 0}
                      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-medium transition ${
                        isRequested
                          ? "bg-success-soft text-success"
                          : credits <= 0
                            ? "cursor-not-allowed border border-border bg-muted text-muted-foreground"
                            : "bg-accent text-accent-foreground hover:brightness-95"
                      }`}
                    >
                      {isRequested ? (
                        <>
                          <Check className="h-3.5 w-3.5" strokeWidth={3} /> Requested
                        </>
                      ) : (
                        "Request interview"
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="border-t border-border pt-6 text-sm text-muted-foreground text-balance">
        Lungisa stays in touch with all placed candidates. You will hear from us if anything needs attention.
      </p>
    </div>
  );
}
