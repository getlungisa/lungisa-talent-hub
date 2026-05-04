import { Candidate } from "../data";
import { Avatar } from "./Avatar";
import { RatingDots } from "./RatingDots";
import { VerifiedBadge } from "./VerifiedBadge";
import { useLungisa } from "../store";
import { Check } from "lucide-react";

export function CandidateCard({
  candidate,
  onOpen,
}: {
  candidate: Candidate;
  onOpen: (id: string) => void;
}) {
  const { requested, requestInterview, credits } = useLungisa();
  const isRequested = requested.has(candidate.id);

  return (
    <article
      onClick={() => onOpen(candidate.id)}
      className="group cursor-pointer rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_8px_30px_-12px_hsl(22_47%_11%/0.12)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={candidate.firstName} />
          <div>
            <h3 className="font-display text-xl text-primary">{candidate.firstName}</h3>
            <p className="text-sm text-muted-foreground">{candidate.role}</p>
          </div>
        </div>
        {candidate.verified && <VerifiedBadge />}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {candidate.attributes.map((a) => (
          <span
            key={a.label}
            className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-primary/80"
          >
            {a.label}
          </span>
        ))}
      </div>

      <div className="mt-4">
        <RatingDots value={candidate.rating} />
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!isRequested) requestInterview(candidate.id);
        }}
        disabled={isRequested || credits <= 0}
        className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
          isRequested
            ? "bg-success-soft text-success"
            : credits <= 0
              ? "cursor-not-allowed border border-border bg-muted text-muted-foreground"
              : "bg-accent text-accent-foreground hover:brightness-95"
        }`}
      >
        {isRequested ? (
          <>
            <Check className="h-4 w-4" strokeWidth={3} /> Interview requested
          </>
        ) : credits <= 0 ? (
          "No credits remaining"
        ) : (
          "Request interview — 1 credit"
        )}
      </button>
    </article>
  );
}