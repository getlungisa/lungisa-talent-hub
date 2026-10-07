import { Avatar } from "../components/Avatar";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import {
  fetchBrowsedCount,
  fetchDashboardPlacements,
  fetchRecentActivity,
  type ActivityRecord,
} from "../lib/dashboard";

export function Activity() {
  const { user } = useAuth();
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [browsedCount, setBrowsedCount] = useState(0);
  const [placementsCount, setPlacementsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadActivity = async () => {
      if (!user) {
        setActivity([]);
        setBrowsedCount(0);
        setPlacementsCount(0);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const [data, count, placements] = await Promise.all([
          fetchRecentActivity(user),
          fetchBrowsedCount(user),
          fetchDashboardPlacements(user),
        ]);

        if (!cancelled) {
          setActivity(data);
          setBrowsedCount(count);
          setPlacementsCount(placements.length);
        }
      } catch (err) {
        console.error("Failed to load activity:", err);

        if (!cancelled) {
          setActivity([]);
          setBrowsedCount(0);
          setPlacementsCount(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadActivity();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="space-y-10">
      <div className="min-w-0">
        <h1 className="font-display text-4xl text-primary text-balance">Activity</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          A quiet record of what you have done on Lungisa.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Candidates browsed" singularLabel="Candidate browsed" value={browsedCount} note="in total" />
        <Stat label="Interviews requested" singularLabel="Interview requested" value={activity.length} note="in total" />
        <Stat label="Active placements" singularLabel="Active placement" value={placementsCount} note="ongoing" />
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl text-primary">
          Interviews requested
        </h2>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Loading activity...
          </div>
        ) : activity.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No interviews requested yet. Browse candidates to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {activity.map((item) => (
              <div
                key={`${item.candidateId}-${item.actionDate}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={item.candidateName} />

                  <div>
                    <div className="break-words font-display text-lg text-primary">
                      {item.candidateName}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {item.candidateLocation ?? "Location not provided"}
                    </div>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-tint px-3 py-1 text-xs font-medium text-primary">
                  <Check className="h-3 w-3" strokeWidth={3} />
                  Requested
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  singularLabel,
  value,
  note,
}: {
  label: string;
  singularLabel: string;
  value: number;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-sm text-muted-foreground">
        {value === 1 ? singularLabel : label}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-4xl text-primary">{value}</span>
        <span className="text-sm text-muted-foreground">{note}</span>
      </div>
    </div>
  );
}
