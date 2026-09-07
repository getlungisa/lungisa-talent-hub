import { Candidate } from "../data";
import { Avatar } from "./Avatar";
import { RatingDots } from "./RatingDots";
import { VerifiedBadge } from "./VerifiedBadge";
import { useLungisa } from "../store";
import { Check, Heart } from "lucide-react";

export function CandidateCard({
  candidate,
  onOpen,
}: {
  candidate: Candidate;
  onOpen: (id: string) => void;
}) {
  const { requested, requestInterview, shortlist, toggleShortlist } = useLungisa();
  const isRequested = requested.has(candidate.id);
  const isSaved = shortlist.has(candidate.id);

  return (
    <article
      onClick={() => onOpen(candidate.id)}
      className="group cursor-pointer rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_8px_30px_-12px_hsl(22_47%_11%/0.12)]"
    >
      <div className="flex items-start gap-3">
        <Avatar name={candidate.firstName} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-xl text-primary">{candidate.firstName}</h3>
          <p className="text-sm text-muted-foreground">{candidate.role}</p>
          {candidate.verified && (
            <div className="mt-1.5">
              <VerifiedBadge />
            </div>
          )}
        </div>
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
        disabled={isRequested}
        className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
          isRequested ? "bg-success-soft text-success" : "bg-accent text-accent-foreground hover:brightness-95"
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

      <div className="mt-3 flex justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleShortlist(candidate.id);
          }}
          aria-label={isSaved ? "Remove from shortlist" : "Save to shortlist"}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition hover:opacity-70 ${
            isSaved ? "text-accent" : "text-muted-foreground"
          }`}
        >
          <Heart className="h-4 w-4" strokeWidth={2} fill={isSaved ? "currentColor" : "none"} />
          {isSaved ? "Saved to shortlist" : "Save to shortlist"}
        </button>
      </div>
    </article>
  );
}
