import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type DashboardPlacement = {
  candidateId: string;
  candidateName: string;
  location: string | null;
  startedDaysAgo: number;
  totalDays: number;
  startedAt: string;
  status: string;
};

export type DashboardShortlistedCandidate = {
  candidateId: string;
  candidateName: string;
  location: string | null;
  status: string;
  allocatedAt: string | null;
};

type Business = {
  id: string;
};

export type Candidate = {
  id: string;
  name: string;
  location: string | null;
};

type PlacementRecord = {
  candidate_id: string;
  placement_date: string;
  status: string;
  candidates: Candidate | Candidate[] | null;
};

type AllocationRecord = {
  candidate_id: string;
  status: string;
  allocated_at: string | null;
  candidates: Candidate | Candidate[] | null;
};

type ActivityRow = {
  candidate_id: string;
  action_type: string;
  action_date: string;
  candidates: Candidate | Candidate[] | null;
};

type QueryResult<T> = Promise<{
  data: T | null;
  error: unknown;
}>;

type UntypedSelectQuery<T> = {
  eq: (column: string, value: string) => UntypedSelectQuery<T>;
  order: (column: string, options: { ascending: boolean }) => QueryResult<T[]>;
  maybeSingle: () => QueryResult<T>;
};

type UntypedTableQuery = {
  select: <T = Record<string, unknown>>(columns: string) => UntypedSelectQuery<T>;
  insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
};

type UntypedDb = {
  from: (table: string) => UntypedTableQuery;
};

// The generated Supabase types have not yet been regenerated for the allocation
// tables, so keep the runtime queries typed locally until they are included.
const db = supabase as unknown as UntypedDb;

export async function fetchCandidates(): Promise<Candidate[]> {
  const { data, error } = await db
    .from("candidates")
    .select<Candidate>("id, name, location")
    .order("name", { ascending: true });

  if (error) {
    console.error("fetchCandidates error", error);
    throw error;
  }

  return (data ?? []) as Candidate[];
}

async function fetchBusiness(user: User): Promise<Business | null> {
  const { data, error } = await db
    .from("businesses")
    .select<Business>("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("fetchDashboard business error", error);
    return null;
  }

  return data as Business | null;
}

function oneCandidate(candidate: Candidate | Candidate[] | null): Candidate | null {
  return Array.isArray(candidate) ? candidate[0] ?? null : candidate;
}

function daysSince(iso: string): number {
  const startedAt = new Date(iso).getTime();
  if (!Number.isFinite(startedAt)) return 0;
  return Math.max(0, Math.floor((Date.now() - startedAt) / 86_400_000));
}

export async function fetchDashboardPlacements(user: User): Promise<DashboardPlacement[]> {
  const business = await fetchBusiness(user);
  if (!business) return [];

  const { data, error } = await db
    .from("placements")
    .select<PlacementRecord>(
      "candidate_id, placement_date, status, candidates!placements_candidate_id_fkey(id, name, location)",
    )
    .eq("business_id", business.id)
    .eq("status", "active")
    .order("placement_date", { ascending: false });

  if (error) {
    console.error("fetchDashboardPlacements error", error);
    return [];
  }

  return (data ?? []).flatMap((placement) => {
    const candidate = oneCandidate(placement.candidates);
    if (!candidate) return [];

    return [
      {
        candidateId: placement.candidate_id,
        candidateName: candidate.name,
        location: candidate.location,
        startedDaysAgo: daysSince(placement.placement_date),
        totalDays: 90,
        startedAt: placement.placement_date,
        status: placement.status,
      },
    ];
  });
}

export async function fetchDashboardShortlisted(
  user: User,
): Promise<DashboardShortlistedCandidate[]> {
  const business = await fetchBusiness(user);
  if (!business) return [];

  const { data, error } = await db
    .from("candidate_allocations")
    .select<AllocationRecord>(
      "candidate_id, status, allocated_at, candidates!candidate_allocations_candidate_id_fkey(id, name, location)",
    )
    .eq("business_id", business.id)
    .eq("status", "shortlisted")
    .order("allocated_at", { ascending: false });

  if (error) {
    console.error("fetchDashboardShortlisted error", error);
    return [];
  }

  return (data ?? []).flatMap((allocation) => {
    const candidate = oneCandidate(allocation.candidates);
    if (!candidate) return [];

    return [
      {
        candidateId: allocation.candidate_id,
        candidateName: candidate.name,
        location: candidate.location,
        status: allocation.status,
        allocatedAt: allocation.allocated_at,
      },
    ];
  });
}

export type ActivityRecord = {
  candidateId: string;
  candidateName: string;
  candidateLocation: string | null;
  actionType: string;
  actionDate: string;
};

export async function fetchRecentActivity(user: User): Promise<ActivityRecord[]> {
  const business = await fetchBusiness(user);
  if (!business) return [];

  const { data, error } = await db
    .from("business_activity")
    .select<ActivityRow>(
      "candidate_id, action_type, action_date, candidates!business_activity_candidate_id_fkey(id, name, location)",
    )
    .eq("business_id", business.id)
    .eq("action_type", "interview_requested")
    .order("action_date", { ascending: false });

  if (error) {
    console.error("fetchRecentActivity error", error);
    return [];
  }

  return (data ?? []).flatMap((activity) => {
    const candidate = oneCandidate(activity.candidates);
    if (!candidate) return [];

    return [
      {
        candidateId: activity.candidate_id,
        candidateName: candidate.name,
        candidateLocation: candidate.location,
        actionType: activity.action_type,
        actionDate: activity.action_date,
      },
    ];
  });
}

export async function insertBusinessActivity(
  user: User,
  candidateId: string,
  actionType: string,
): Promise<boolean> {
  const business = await fetchBusiness(user);
  if (!business) return false;

  const { error } = await db.from("business_activity").insert({
    business_id: business.id,
    candidate_id: candidateId,
    action_type: actionType,
    action_date: new Date().toISOString(),
  });

  if (error) {
    console.error("insertBusinessActivity error", error);
    return false;
  }

  return true;
}
