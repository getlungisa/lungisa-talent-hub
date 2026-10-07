import { useRef, useState, type MouseEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Avatar } from "./Avatar";
import { RatingDots } from "./RatingDots";
import { VerifiedBadge } from "./VerifiedBadge";
import { toggleCandidateShortlist } from "../lib/dashboard";
import { Check, Heart } from "lucide-react";
import type { Candidate as MockCandidate } from "../data";
import type { Candidate as SupabaseCandidate } from "../lib/dashboard";

type Candidate = MockCandidate | SupabaseCandidate;

const shortlistConflictTitle = "Candidate no longer available";
const shortlistConflictDescription =
  "The candidate is no longer available and was not added to your shortlist.";
const shortlistErrorTitle = "Couldn't update shortlist";
const shortlistErrorDescription = "Please try again.";

export function CandidateCard({
  candidate,
  isShortlisted,
  isRequested,
  onShortlistChanged,
  onInterviewRequested,
  onOpen,
}: {
  candidate: Candidate;
  isShortlisted: boolean;
  isRequested: boolean;
  onShortlistChanged: (candidateId: string, shortlisted: boolean) => void;
  onInterviewRequested: (candidateId: string) => Promise<boolean>;
  onOpen: (id: string) => void;
}) {
  const { user } = useAuth();
  const shortlistRequestInFlight = useRef(false);
  const [isUpdatingShortlist, setIsUpdatingShortlist] = useState(false);

  const isSaved = isShortlisted;
  const name = "firstName" in candidate ? candidate.firstName : candidate.name;
  const summary =
    "role" in candidate
      ? candidate.role
      : (candidate.location ?? "Location not provided");
  const strengthsSummary =
    "strengths_summary" in candidate &&
    typeof candidate.strengths_summary === "string"
      ? candidate.strengths_summary.trim()
      : "";
  const attributes = "attributes" in candidate ? candidate.attributes : [];
  const partnerName =
    "training_partner" in candidate
      ? (candidate.training_partner?.name?.trim() ?? "")
      : "";
  const verified = "verified" in candidate ? candidate.verified : false;

  const handleShortlistClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (shortlistRequestInFlight.current) {
      return;
    }

    if (!user) {
      toast.error(shortlistErrorTitle, {
        description: shortlistErrorDescription,
      });
      return;
    }

    shortlistRequestInFlight.current = true;
    setIsUpdatingShortlist(true);

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
      shortlistRequestInFlight.current = false;
      setIsUpdatingShortlist(false);
    }
  };

  return (
    <article
      onClick={() => onOpen(candidate.id)}
      aria-label={`${name} — ${summary}`}
      className="group flex cursor-pointer flex-col rounded-2xl border border-border bg-card p-5 transition hover:border-primary"
    >
      <div className="flex w-full min-w-0 items-start gap-3">
        <Avatar name={name} />

        <div className="min-w-0 flex-1">
          <h3 className="break-words font-display text-xl leading-tight text-foreground">
            {name}
          </h3>
          <p className="text-sm text-muted-foreground">{summary}</p>

          {partnerName ? (
            <div className="mt-1.5">
              <VerifiedBadge partner={partnerName} />
            </div>
          ) : (
            verified && (
              <div className="mt-1.5">
                <VerifiedBadge />
              </div>
            )
          )}
        </div>
      </div>

      {attributes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {attributes.map((attribute) => (
            <span
              key={attribute.label}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground"
            >
              {attribute.label}
            </span>
          ))}
        </div>
      )}

      {strengthsSummary && (
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {strengthsSummary}
        </p>
      )}

      {"rating" in candidate && (
        <div className="mt-4">
          <RatingDots value={candidate.rating} />
        </div>
      )}

      <div className="mt-auto">
        <button
          onClick={async (event) => {
            event.stopPropagation();
            if (!isRequested) {
              await onInterviewRequested(candidate.id);
            }
          }}
          disabled={isRequested}
          className={`mt-5 inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition ${
            isRequested
              ? "bg-primary-tint text-primary"
              : "border border-input bg-transparent text-primary hover:bg-primary-tint"
          }`}
        >
          {isRequested ? (
            <>
              <Check className="h-4 w-4" strokeWidth={3} />
              Interview requested
            </>
          ) : (
            "Request interview"
          )}
        </button>

        {isRequested && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            We'll be in touch within 24 hours.
          </p>
        )}

        <div className="mt-3 flex justify-center">
          <button
            onClick={handleShortlistClick}
            disabled={isUpdatingShortlist}
            aria-label={isSaved ? "Remove from shortlist" : "Save to shortlist"}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs transition hover:opacity-70 ${
              isSaved ? "text-primary" : "text-muted-foreground"
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
      </div>
    </article>
  );
}
