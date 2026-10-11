import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lungisa/lib/needs";
import {
  fetchIsAdmin,
  fetchPendingBusinesses,
  setBusinessStatus,
  type PendingBusiness,
} from "@/lungisa/lib/business";

// Only http(s) links become clickable; anything else (handles, javascript:
// URLs, ...) is shown as plain, React-escaped text.
function safeHref(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground sm:w-24 sm:shrink-0">{label}</dt>
      <dd className="text-sm text-foreground break-words min-w-0">{children}</dd>
    </div>
  );
}

export default function AdminBusinesses() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [businesses, setBusinesses] = useState<PendingBusiness[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBusinesses(await fetchPendingBusinesses());
      setError(null);
    } catch (e) {
      console.error("fetchPendingBusinesses error", e);
      setError("We couldn't load pending businesses.");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const admin = await fetchIsAdmin();
      if (cancelled) return;
      setIsAdmin(admin);
      if (admin) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [user, load]);

  const decide = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    setError(null);
    try {
      await setBusinessStatus(id, status);
      setBusinesses((list) => list.filter((b) => b.id !== id));
    } catch (e) {
      console.error("setBusinessStatus error", e);
      setError("That didn't work. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  if (isAdmin === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-muted-foreground text-sm">Page not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <h1 className="font-display text-3xl text-foreground">Pending businesses</h1>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {businesses.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">No businesses waiting for review.</p>
        )}
        <ul className="space-y-4">
          {businesses.map((b) => {
            const href = safeHref(b.website_or_social);
            return (
              <li key={b.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h2 className="font-display text-xl text-foreground break-words">{b.name}</h2>
                <dl className="space-y-2">
                  <Row label="Contact">
                    {b.contact_name} · {b.contact_email}
                    {b.whatsapp_number ? ` · ${b.whatsapp_number}` : ""}
                  </Row>
                  <Row label="Area">{b.area}</Row>
                  <Row label="Sites">{b.number_of_sites}</Row>
                  <Row label="Roles">{b.roles_hired}</Row>
                  {b.website_or_social && (
                    <Row label="Link">
                      {href ? (
                        <a className="underline" href={href} target="_blank" rel="noopener noreferrer">
                          {b.website_or_social}
                        </a>
                      ) : (
                        b.website_or_social
                      )}
                    </Row>
                  )}
                  <Row label="Submitted">{relativeTime(b.created_at)}</Row>
                </dl>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover"
                    disabled={busyId === b.id}
                    onClick={() => void decide(b.id, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={busyId === b.id}
                    onClick={() => void decide(b.id, "rejected")}
                  >
                    Reject
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
