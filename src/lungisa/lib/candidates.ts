import { supabase } from "@/integrations/supabase/client";

export type BrowseCandidate = {
  id: string;
  name: string;
  role: string | null;
  location: string | null;
};

type CandidatesQuery = {
  from: (table: "candidates") => {
    select: (query: string) => {
      order: (
        column: string,
        options: { ascending: boolean },
      ) => Promise<{ data: unknown[] | null; error: Error | null }>;
    };
  };
};

const db = supabase as unknown as CandidatesQuery;

function toBrowseCandidate(candidate: unknown): BrowseCandidate | null {
  if (!candidate || typeof candidate !== "object") return null;

  const { id, name, role, location } = candidate as Record<string, unknown>;

  if (typeof id !== "string" || typeof name !== "string") {
    return null;
  }

  return {
    id,
    name,
    role: typeof role === "string" ? role : null,
    location: typeof location === "string" ? location : null,
  };
}

export async function fetchCandidates(): Promise<BrowseCandidate[]> {
  const { data, error } = await db
    .from("candidates")
    .select("id, name, role, location")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).flatMap((candidate) => {
    const normalized = toBrowseCandidate(candidate);
    return normalized ? [normalized] : [];
  });
}
