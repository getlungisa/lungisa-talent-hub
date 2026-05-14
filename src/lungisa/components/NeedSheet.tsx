import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { submitNeed } from "../lib/needs";

const ROLES = ["Front of house", "Barista", "Waiter/Waitress", "Other"];
const TIMINGS = ["< 1 week", "< 2 weeks", "< 4 weeks", "Flexible / no rush"];
const MUST_HAVES_LIMIT = 200;

export function NeedSheet({
  open,
  onOpenChange,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const [role, setRole] = useState("");
  const [timing, setTiming] = useState("");
  const [mustHaves, setMustHaves] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setRole("");
      setTiming("");
      setMustHaves("");
      setError(null);
      setSubmitting(false);
      setDone(false);
    }
  }, [open]);

  const canSubmit =
    !!role && !!timing && mustHaves.length <= MUST_HAVES_LIMIT && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be signed in.");
      return;
    }
    if (!role || !timing) {
      setError("Please choose a role and timing.");
      return;
    }
    if (mustHaves.length > MUST_HAVES_LIMIT) {
      setError(`Must-haves must be under ${MUST_HAVES_LIMIT} characters.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await submitNeed(user, { role, timing, must_haves: mustHaves });
      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      console.error("NeedSheet submit failed", err);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    if (done) onSubmitted();
  };

  const selectClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o && done) onSubmitted();
        onOpenChange(o);
      }}
    >
      <SheetContent
        side="right"
        className="w-full overflow-y-auto bg-background p-0 sm:max-w-xl"
      >
        <div className="flex min-h-full flex-col px-6 py-8 sm:px-10 sm:py-12">
          {done ? (
            <div className="flex flex-1 flex-col">
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
                <Check className="h-6 w-6 text-success" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-3xl text-primary sm:text-4xl">
                We're on it.
              </h2>
              <p className="mt-4 max-w-md text-base text-muted-foreground">
                We'll be back within 24 hours with people who can help.
              </p>
              <div className="mt-auto pt-10">
                <button
                  onClick={handleClose}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-9 py-4 text-base font-medium text-accent-foreground shadow-[0_14px_36px_-12px_hsl(19_63%_44%/0.55)] transition hover:brightness-95 sm:w-auto"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
              <h2 className="font-display text-3xl text-primary sm:text-4xl">
                Tell us who you need.
              </h2>
              <p className="mt-3 max-w-md text-base text-muted-foreground">
                We'll be back within 24 hours with people we think can help.
              </p>

              <div className="mt-8 space-y-6">
                <div className="space-y-2">
                  <label htmlFor="role" className="text-sm font-medium text-primary">
                    Role <span className="text-accent">*</span>
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    className={selectClass}
                  >
                    <option value="" disabled>Choose a role</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="timing" className="text-sm font-medium text-primary">
                    Timing <span className="text-accent">*</span>
                  </label>
                  <select
                    id="timing"
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                    required
                    className={selectClass}
                  >
                    <option value="" disabled>When do you need them?</option>
                    {TIMINGS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="must_haves" className="text-sm font-medium text-primary">
                    Must-haves
                  </label>
                  <textarea
                    id="must_haves"
                    value={mustHaves}
                    onChange={(e) => setMustHaves(e.target.value.slice(0, MUST_HAVES_LIMIT))}
                    placeholder="e.g. Saturday availability, can lift heavy items, 2+ years experience"
                    rows={4}
                    className={`${selectClass} resize-none`}
                  />
                  <div className="text-right text-xs text-muted-foreground">
                    {mustHaves.length}/{MUST_HAVES_LIMIT}
                  </div>
                </div>
              </div>

              {error && (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              )}

              <div className="mt-auto pt-10">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-9 py-4 text-base font-medium text-accent-foreground shadow-[0_14px_36px_-12px_hsl(19_63%_44%/0.55)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none sm:w-auto"
                >
                  {submitting ? "Sending..." : "Tell us who you need"}
                  {!submitting && (
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
