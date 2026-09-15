import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PlacementRow } from "../components/PlacementRow";
import {
  fetchDashboardPlacements,
  type DashboardPlacement,
} from "../lib/dashboard";

export function Placements() {
  const { user } = useAuth();
  const [placements, setPlacements] = useState<DashboardPlacement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPlacements = async () => {
      setLoading(true);

      if (!user) {
        setPlacements([]);
        setLoading(false);
        return;
      }

      try {
        const data = await fetchDashboardPlacements(user);

        if (cancelled) return;
        setPlacements(data);
      } catch (error) {
        console.error("Failed to load placements:", error);

        if (cancelled) return;
        setPlacements([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPlacements();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-primary text-balance">
          Active placements
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          A clear view of everyone you have placed through Lungisa, and where
          they are in their first thirty days.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Loading placements...
        </div>
      ) : placements.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          You have no active placements yet.
        </div>
      ) : (
        <div className="space-y-3">
          {placements.map((p) => (
            <PlacementRow
              key={p.candidateId}
              name={p.candidateName}
              role={p.location ?? "Location not provided"}
              day={p.startedDaysAgo}
              total={p.totalDays}
              startDate={`${p.startedDaysAgo} days ago`}
            />
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-accent-soft/40 p-5 text-sm text-primary/80">
        Lungisa stays close to every placed candidate. You will hear from us if
        anything needs attention.
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        <span className="font-medium text-primary">A note on fees.</span> Your
        placement fee becomes due on day 30. We will send a single, plain
        invoice - no surprises.
      </div>
    </div>
  );
}
