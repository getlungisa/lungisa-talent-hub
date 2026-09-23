import { useEffect, useRef, useState } from "react";
import { candidates as mockCandidates } from "../data";
import { Avatar } from "../components/Avatar";
import { RatingDots } from "../components/RatingDots";
import { useLungisa } from "../store";
import { createPortal } from "react-dom";
import {
  fetchCandidate,
  insertBusinessActivity,
  type Candidate,
} from "../lib/dashboard";
import { useAuth } from "@/contexts/AuthContext";
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

export function CandidateDetail({
  id,
  onBack,
  onCandidateStatusChange,
  isTrainingPartner = false
}: {
  id: string;
  onBack: () => void;
  onCandidateStatusChange?: (exists: boolean | null) => void;
  isTrainingPartner?: boolean;
}) {

  const mockCandidate = mockCandidates.find((candidate) => candidate.id === id);
  const { user } = useAuth();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(!mockCandidate);
  const [loadError, setLoadError] = useState(false);
  const viewedCandidateIdRef = useRef<string | null>(null);

  useEffect(() => {
    const candidateId = candidate?.id;

    if (
      !user ||
      !candidateId ||
      viewedCandidateIdRef.current === candidateId
    ) {
      return;
    }

    viewedCandidateIdRef.current = candidateId;

    void insertBusinessActivity(user, candidateId, "candidate_viewed");
  }, [user, candidate?.id]);

  useEffect(() => {
    if (mockCandidate) {
      setCandidate(null);
      setLoading(false);
      setLoadError(false);
      onCandidateStatusChange?.(true);
      return;
    }

    let cancelled = false;

    const loadCandidate = async () => {
      setLoading(true);
      setLoadError(false);
      onCandidateStatusChange?.(null);

      try {
        const nextCandidate = await fetchCandidate(id);
        if (cancelled) return;
        setCandidate(nextCandidate);
        onCandidateStatusChange?.(Boolean(nextCandidate));
      } catch (error) {
        console.error("Failed to load candidate:", error);
        if (cancelled) return;
        setCandidate(null);
        setLoadError(true);
        onCandidateStatusChange?.(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCandidate();

    return () => {
      cancelled = true;
    };
  }, [id, mockCandidate, onCandidateStatusChange]);

  if (mockCandidate) {
    const candidate = mockCandidate;

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

          {!isTrainingPartner && (
            <aside className="lg:sticky lg:top-32 lg:self-start">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Next step
                </div>
                <p className="mt-2 text-sm text-primary/80">
                  We will arrange a time that works for you both - usually within 24 hours.
                </p>
              </div>
            </aside>
          )}
        </section>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6 pb-28">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
        </button>
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          We could not load this candidate right now. Please try again shortly.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-28">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
        </button>
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Loading candidate...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
      </button>

      {!candidate ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Candidate not found.
        </div>
      ) : (
        <>
          <header className="space-y-1.5">
            <div className="flex items-center gap-3">
              <Avatar name={candidate.name} size={48} />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl text-primary">{candidate.name}</h1>
              </div>
            </div>
            <div className="pl-[60px]">
              <p className="text-sm text-muted-foreground">
                {candidate.location ?? "Location not provided"}
              </p>
            </div>
          </header>

          <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-8">
              <div>
                <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  At a glance
                </h2>
                <dl className="mt-3 grid gap-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                    <div className="min-w-0">
                      <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        Location
                      </dt>
                      <dd className="mt-1 text-[15px] text-primary">
                        {candidate.location ?? "Location not provided"}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 text-sm text-primary/80">
                We can help coordinate the next step if you would like to meet this candidate.
              </div>
            </div>

           <aside className="lg:sticky lg:top-32 lg:self-start">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Next step
                </div>
                <p className="mt-2 text-sm text-primary/80">
                  We will arrange a time that works for you both - usually within 24 hours.
                </p>
              </div>
            </aside>
           {!isTrainingPartner && (
              <aside className="lg:sticky lg:top-32 lg:self-start">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Next step
                  </div>
                  <p className="mt-2 text-sm text-primary/80">
                    We will arrange a time that works for you both - usually within 24 hours.
                  </p>
                </div>
              </aside>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function CandidateInterviewBar({
  id,
  candidateExists,
  isTrainingPartner = false,
}: {
  id: string;
  candidateExists: boolean | null;
  isTrainingPartner?: boolean;
}) {
  const { requested, requestInterview } = useLungisa();

  if (
    typeof document === "undefined" ||
    candidateExists !== true ||
    isTrainingPartner
  ) {
    return null;
  }

  const isRequested = requested.has(id);

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-background shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.12)]"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))",
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        willChange: "transform",
      }}
    >
      <div className="mx-auto max-w-6xl px-5 pt-3.5">
        <button
          onClick={() => !isRequested && requestInterview(id)}
          disabled={isRequested}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition ${
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
      </div>
    </div>,
    document.body,
  );
}
