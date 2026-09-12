import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { ensureBusiness } from "./needs";

const PLACEMENT_FEE_DUE_DAYS = 30;

export type DashboardPlacement = {
  candidateId: string;
  candidateName: string;
  role: string;
  startedDaysAgo: number;
  totalDays: number;
};

export type DashboardShortlistedCandidate = {
  id: string;
  firstName: string;
  role: string;
  verified: boolean;
};

type PlacementRow = {
  candidate_id: string;
  placement_date: string;
  candidates: CandidateRow | CandidateRow[] | null;
};

type CandidateRow = {
  id: string;
  first_name: string;
  role: string;
  verified: boolean;
};

type ShortlistedAllocationRow = {
  candidate_id: string;
  candidates: CandidateRow | CandidateRow[] | null;
};

function pickCandidate(value: CandidateRow | CandidateRow[] | null): CandidateRow | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function fetchDashboardPlacements(user: User): Promise<DashboardPlacement[]> {
  let business: { id: string };
  try {
    business = await ensureBusiness(user);
  } catch (err) {
    console.error("fetchDashboardPlacements ensureBusiness error", err);
    return [];
  }

  const { data: placementsData, error: placementsError } = await supabase
    .from("placements")
    .select("candidate_id, placement_date, candidates(id, first_name, role, verified)")
    .eq("business_id", business.id)
    .order("placement_date", { ascending: false });

  if (placementsError) {
    console.error("fetchDashboardPlacements error", placementsError);
    return [];
  }

  const placements = (placementsData ?? []) as PlacementRow[];
  if (placements.length === 0) return [];
  const now = Date.now();

  return placements.map((p) => {
    const candidate = pickCandidate(p.candidates);
    const startedMs = new Date(p.placement_date).getTime();
    const startedDaysAgo = Number.isNaN(startedMs) ? 0 : Math.max(0, Math.floor((now - startedMs) / 86400000));

    return {
      candidateId: p.candidate_id,
      candidateName: candidate?.first_name ?? "Candidate",
      role: candidate?.role ?? "Role not set",
      startedDaysAgo,
      totalDays: PLACEMENT_FEE_DUE_DAYS,
    };
  });
}

export async function fetchDashboardShortlisted(user: User): Promise<DashboardShortlistedCandidate[]> {
  let business: { id: string };
  try {
    business = await ensureBusiness(user);
  } catch (err) {
    console.error("fetchDashboardShortlisted ensureBusiness error", err);
    return [];
  }

  const { data: allocationsData, error: allocationsError } = await supabase
    .from("candidate_allocations")
    .select("candidate_id, candidates(id, first_name, role, verified)")
    .eq("business_id", business.id)
    .eq("status", "shortlisted");

  if (allocationsError) {
    console.error("fetchDashboardShortlisted allocations error", allocationsError);
    return [];
  }

  const rows = (allocationsData ?? []) as ShortlistedAllocationRow[];
  const unique = new Map<string, CandidateRow>();
  rows.forEach((row) => {
    const candidate = pickCandidate(row.candidates);
    if (candidate && !unique.has(candidate.id)) unique.set(candidate.id, candidate);
  });

  return Array.from(unique.values()).map((candidate) => ({
    id: candidate.id,
    firstName: candidate.first_name,
    role: candidate.role,
    verified: Boolean(candidate.verified),
  }));
}
