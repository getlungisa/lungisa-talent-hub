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

type Candidate = {
  id: string;
  name: string;
  location: string | null;
};

type PlacementRecord = {
  candidate_id: string;
  started_at: string;
  total_days: number;
  status: string;
  candidates: Candidate | Candidate[] | null;
};

type AllocationRecord = {
  candidate_id: string;
  status: string;
  allocation_at: string | null;
  candidates: Candidate | Candidate[] | null;
};

// The generated Supabase types have not yet been regenerated for the allocation
// tables, so keep the runtime queries typed locally until they are included.
const db = supabase as any;

async function fetchBusiness(user: User): Promise<Business | null> {
  const { data, error } = await db
    .from("businesses")
    .select("id")
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
    .select(
      "candidate_id, started_at, total_days, status, candidates!placements_candidate_id_fkey(id, name, location)",
    )
    .eq("business_id", business.id)
    .eq("status", "active")
    .order("started_at", { ascending: false });

  if (error) {
    console.error("fetchDashboardPlacements error", error);
    return [];
  }

  return ((data ?? []) as PlacementRecord[]).flatMap((placement) => {
    const candidate = oneCandidate(placement.candidates);
    if (!candidate) return [];

    return [
      {
        candidateId: placement.candidate_id,
        candidateName: candidate.name,
        location: candidate.location,
        startedDaysAgo: daysSince(placement.started_at),
        totalDays: placement.total_days,
        startedAt: placement.started_at,
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
    .select(
      "candidate_id, status, allocation_at, candidates!candidate_allocations_candidate_id_fkey(id, name, location)",
    )
    .eq("business_id", business.id)
    .eq("status", "shortlisted")
    .order("allocation_at", { ascending: false });

  if (error) {
    console.error("fetchDashboardShortlisted error", error);
    return [];
  }

  return ((data ?? []) as AllocationRecord[]).flatMap((allocation) => {
    const candidate = oneCandidate(allocation.candidates);
    if (!candidate) return [];

    return [
      {
        candidateId: allocation.candidate_id,
        candidateName: candidate.name,
        location: candidate.location,
        status: allocation.status,
        allocatedAt: allocation.allocation_at,
      },
    ];
  });
}
