import { candidates } from "../data";
import { Avatar } from "./Avatar";
import { RatingDots } from "./RatingDots";
import { VerifiedBadge } from "./VerifiedBadge";
import { useLungisa } from "../store";
import { Heart, ArrowRight } from "lucide-react";

export function RecommendedRow({
  onOpenCandidate,
  onSeeAll,
}: {
  onOpenCandidate: (id: string) => void;
  onSeeAll: () => void;
}) {
  const { shortlist, toggleShortlist } = useLungisa();

  const recommended = [...candidates]
    .filter((c) => c.verified)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Recommended for you
        </p>
      </div>

      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className="flex gap-4 pb-2">
          {recommended.map((c) => {
            const isSaved = shortlist.has(c.id);
            return (
              <article
                key={c.id}
                className="group relative flex w-[220px] shrink-0 cursor-pointer flex-col rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_8px_30px_-12px_hsl(22_47%_11%/0.12)]"
                onClick={() => onOpenCandidate(c.id)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleShortlist(c.id);
                  }}
                  aria-label={isSaved ? "Remove from shortlist" : "Save to shortlist"}
                  className={`absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full transition hover:opacity-70 ${
                    isSaved ? "text-accent" : "text-muted-foreground"
                  }`}
                >
                  <Heart className="h-5 w-5" strokeWidth={2} fill={isSaved ? "currentColor" : "none"} />
                </button>

                <div className="flex items-start gap-2 pr-10">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.firstName} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate font-display text-lg leading-tight text-primary">
                          {c.firstName}
                        </h3>
                        {c.verified && <VerifiedBadge />}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{c.role}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {c.attributes.slice(0, 2).map((a) => (
                    <span
                      key={a.label}
                      className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-primary/80"
                    >
                      {a.label}
                    </span>
                  ))}
                </div>

                <div className="mt-3">
                  <RatingDots value={c.rating} label={false} />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs font-medium text-accent group-hover:underline">
                    View profile
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-accent transition group-hover:translate-x-0.5" />
                </div>
              </article>
            );
          })}
        </div>
      </div>

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