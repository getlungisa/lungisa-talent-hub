import { candidates } from "../data";
import { Avatar } from "../components/Avatar";
import { RatingDots } from "../components/RatingDots";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { useLungisa } from "../store";
import {
  ArrowLeft,
  Check,
  MapPin,
  Bus,
  Clock,
  CalendarDays,
  MessageCircle,
  ShieldCheck,
  Briefcase,
  Coffee,
} from "lucide-react";

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
    <div className="space-y-6 pb-28">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
      </button>

      <header className="space-y-1.5">
        <div className="flex items-center gap-3">
          <Avatar name={candidate.firstName} size={48} />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl text-primary">{candidate.firstName}</h1>
            {candidate.verified && <VerifiedBadge />}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 pl-[60px]">
          <p className="text-sm text-muted-foreground">{candidate.role}</p>
          <RatingDots value={candidate.rating} />
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <div>
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              At a glance
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                { icon: MapPin, label: "Location", value: candidate.glance.location },
                { icon: Bus, label: "Transport", value: candidate.glance.transport },
                { icon: Clock, label: "Earliest start", value: candidate.glance.earliestStart },
                {
                  icon: CalendarDays,
                  label: "Weekend availability",
                  value: candidate.glance.weekends,
                  positive: true,
                },
                { icon: MessageCircle, label: "Languages", value: candidate.glance.languages },
                { icon: ShieldCheck, label: "Work status", value: candidate.glance.workStatus },
                { icon: Briefcase, label: "Availability", value: candidate.glance.availability },
                { icon: Coffee, label: "Experience", value: candidate.glance.experience },
              ].map(({ icon: Icon, label, value, positive }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                  <div className="min-w-0">
                    <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      {label}
                    </dt>
                    <dd
                      className={`mt-1 text-[15px] ${
                        positive ? "text-success font-medium" : "text-primary"
                      }`}
                    >
                      {value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

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
          </div>
        </aside>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.1)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-5xl">
          <button
            onClick={() => !isRequested && requestInterview(candidate.id)}
            disabled={isRequested || credits <= 0}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition ${
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
              "Request interview · 1 credit"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}