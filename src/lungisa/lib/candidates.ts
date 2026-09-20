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
      ) => Promise<{ data: BrowseCandidate[] | null; error: Error | null }>;
    };
  };
};

const db = supabase as unknown as CandidatesQuery;

export async function fetchCandidates(): Promise<BrowseCandidate[]> {
  const { data, error } = await db
    .from("candidates")
    .select("id, name, role, location")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as BrowseCandidate[]).filter(
    (candidate): candidate is BrowseCandidate => Boolean(candidate?.id && candidate?.name),
  );
}
