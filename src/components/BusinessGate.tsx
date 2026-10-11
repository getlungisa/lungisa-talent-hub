import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { fetchOwnBusiness, type BusinessStatus } from "@/lungisa/lib/needs";
import {
  clearRegistrationDraft,
  loadRegistrationDraft,
  registerBusiness,
} from "@/lungisa/lib/business";

export const CONTACT_EMAIL = "hi@lungisa.co";

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "none" }
  | { kind: "business"; status: BusinessStatus };

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 space-y-4">
        <h1 className="font-display text-3xl text-foreground">{title}</h1>
        {children}
      </div>
    </main>
  );
}

// Renders children (and therefore fires candidate queries) only once the
// signed-in user's business is approved. Pending / rejected / missing
// businesses get a static screen that never loads candidate data.
export function BusinessGate({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setState({ kind: "loading" });
      try {
        let business = await fetchOwnBusiness(user);

        // Magic link opened on the sign-up device but redirected to "/": finish
        // the registration the user already submitted on /join.
        if (!business) {
          const draft = loadRegistrationDraft();
          if (draft) {
            try {
              await registerBusiness(draft);
            } catch (e) {
              console.error("draft registration failed", e);
            }
            clearRegistrationDraft();
            business = await fetchOwnBusiness(user);
          }
        }

        if (!cancelled) {
          setState(business ? { kind: "business", status: business.status } : { kind: "none" });
        }
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, attempt]);

  if (state.kind === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <Notice title="Something went wrong">
        <p className="text-sm text-muted-foreground">We couldn't load your account. Please try again.</p>
        <Button onClick={() => setAttempt((n) => n + 1)} className="bg-primary text-primary-foreground hover:bg-primary-hover">
          Try again
        </Button>
      </Notice>
    );
  }

  if (state.kind === "none") {
    return (
      <Notice title="Join Lungisa">
        <p className="text-sm text-muted-foreground">
          We couldn't find a business for this email. Tell us about your business to get started.
        </p>
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary-hover">
          <Link to="/join">Join Lungisa</Link>
        </Button>
      </Notice>
    );
  }

  if (state.status === "pending") {
    return (
      <Notice title="We're reviewing your details">
        <p className="text-sm text-muted-foreground">
          Thanks for joining Lungisa. We'll email you as soon as your business is approved, usually within a day.
        </p>
        <Button variant="outline" onClick={() => void signOut()}>
          Sign out
        </Button>
      </Notice>
    );
  }

  if (state.status === "rejected") {
    return (
      <Notice title="We couldn't approve your business">
        <p className="text-sm text-muted-foreground">
          If you think this is a mistake, email us at{" "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <Button variant="outline" onClick={() => void signOut()}>
          Sign out
        </Button>
      </Notice>
    );
  }

  if (state.status !== "approved") {
    return null;
  }

  return <>{children}</>;
}
