import { useState, type MouseEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "./Avatar";
import { RatingDots } from "./RatingDots";
import { VerifiedBadge } from "./VerifiedBadge";
import { toggleCandidateShortlist } from "../lib/dashboard";
import { useLungisa } from "../store";
import { Check, Heart } from "lucide-react";
import type { Candidate as MockCandidate } from "../data";
import type { Candidate as SupabaseCandidate } from "../lib/dashboard";
import { toast } from "sonner";

type Candidate = MockCandidate | SupabaseCandidate;
const conflictTitle = "Candidate no longer available";
const conflictDescription =
  "Another business shortlisted this candidate first. The candidate was not added to your shortlist.";
const genericErrorTitle = "Couldn’t update shortlist";
const genericErrorDescription = "Please try again.";

export function CandidateCard({
  candidate,
  onOpen,
}: {
  candidate: Candidate;
  onOpen: (id: string) => void;
}) {
  const { user } = useAuth();
  const { requested, requestInterview, shortlist, toggleShortlist } = useLungisa();
  const [isUpdatingShortlist, setIsUpdatingShortlist] = useState(false);
  const isRequested = requested.has(candidate.id);
  const isSaved = shortlist.has(candidate.id);
  const name = "firstName" in candidate ? candidate.firstName : candidate.name;
  const summary = "role" in candidate ? candidate.role : candidate.location ?? "Location not provided";
  const attributes = "attributes" in candidate ? candidate.attributes : [];
  const verified = "verified" in candidate ? candidate.verified : false;

  const handleShortlistClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (isUpdatingShortlist) {
      return;
    }

    if (!user) {
      toast.error(genericErrorTitle, { description: genericErrorDescription });
      return;
    }

    setIsUpdatingShortlist(true);

    try {
      const nextShortlisted = await toggleCandidateShortlist(user, candidate.id, isSaved);

      if (nextShortlisted !== isSaved) {
        toggleShortlist(candidate.id);
      }
    } catch (error) {
      if (error instanceof Error && error.message === "candidate_already_claimed") {
        toast.error(conflictTitle, { description: conflictDescription });
      } else {
        toast.error(genericErrorTitle, { description: genericErrorDescription });
      }
    } finally {
      setIsUpdatingShortlist(false);
    }
  };

  return (
    <article
      onClick={() => onOpen(candidate.id)}
      aria-label={`${name} — ${summary}`}
      className="group cursor-pointer rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_8px_30px_-12px_hsl(22_47%_11%/0.12)]"
    >
      <div className="flex items-start gap-3">
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-xl text-primary">{name}</h3>
          <p className="text-sm text-muted-foreground">{summary}</p>
          {verified && (
            <div className="mt-1.5">
              <VerifiedBadge />
            </div>
          )}
        </div>
      </div>

      {attributes.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {attributes.map((attribute) => (
            <span
              key={attribute.label}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-primary/80"
            >
              {attribute.label}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-primary/80">
            {summary}
          </span>
        </div>
      )}

      {"rating" in candidate && (
        <div className="mt-4">
          <RatingDots value={candidate.rating} />
        </div>
      )}

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
          onClick={handleShortlistClick}
          disabled={isUpdatingShortlist}
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
