import { candidates } from "../data";
import { Avatar } from "../components/Avatar";
import { RatingDots } from "../components/RatingDots";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { useLungisa } from "../store";
import { ArrowLeft, Check } from "lucide-react";

export function CandidateDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const candidate = candidates.find((c) => c.id === id);
  const { requested, requestInterview, credits } = useLungisa();

  if (!candidate) {
    return (
      <button onClick={onBack} className="text-sm text-accent">
        ← Back
      </button>
    );
  }

  const isRequested = requested.has(candidate.id);

  return (
    <div className="space-y-8">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
      </button>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={candidate.firstName} size={64} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-4xl text-primary">{candidate.firstName}</h1>
              {candidate.verified && <VerifiedBadge />}
            </div>
            <p className="mt-1 text-muted-foreground">{candidate.role}</p>
            <div className="mt-3">
              <RatingDots value={candidate.rating} />
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <div>
            <h2 className="font-display text-xl text-primary">How we assessed {candidate.firstName}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-primary/80">{candidate.assessment}</p>
          </div>

          <div>
            <h2 className="font-display text-xl text-primary">What stood out</h2>
            <div className="mt-4 space-y-3">
              {candidate.attributes.map((a) => (
                <div key={a.label} className="rounded-xl border border-border bg-card p-4">
                  <div className="font-medium text-primary">{a.label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{a.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display text-xl text-primary">Background</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-primary/80">{candidate.background}</p>
          </div>
        </div>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Next step</div>
            <p className="mt-2 text-sm text-primary/80">
              We will arrange a time that works for you both — usually within 24 hours.
            </p>
            <button
              onClick={() => !isRequested && requestInterview(candidate.id)}
              disabled={isRequested || credits <= 0}
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition ${
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
            <p className="mt-3 text-xs text-muted-foreground">
              Lungisa will arrange the interview and be in touch within 24 hours.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}