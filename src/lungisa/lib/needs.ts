import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Need = {
  id: string;
  business_id: string;
  role: string;
  timing: string;
  must_haves: string | null;
  status: string;
  created_at: string;
};

export type BusinessStatus = "pending" | "approved" | "rejected";

export type OwnBusiness = {
  id: string;
  name: string;
  contact_email: string;
  status: BusinessStatus;
};

type OwnBusinessRow = OwnBusiness & { user_id: string | null };

// A user can match several business rows (primary and secondary owner). Prefer
// the row they own, then the first approved row, then the first row, and warn
// with every id so the duplicate can be investigated.
export function pickBusinessRow<T extends { id: string; status?: string; user_id?: string | null }>(
  rows: T[],
  userId: string,
): T | null {
  if (rows.length === 0) return null;
  if (rows.length > 1) {
    console.warn(
      `Multiple businesses matched user ${userId}: ${rows.map((r) => r.id).join(", ")}`,
    );
  }
  return (
    rows.find((r) => r.user_id === userId) ??
    rows.find((r) => r.status === "approved") ??
    rows[0]
  );
}

// Read-only: business rows are created only through the register_business /
// admin_create_business database functions, never from the client.
export async function fetchOwnBusiness(user: User): Promise<OwnBusiness | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select('id, name, status, user_id, contact_email:"contact email"')
    .or(`user_id.eq.${user.id},secondary_user_id.eq.${user.id}`);
  if (error) {
    console.error("fetchOwnBusiness error", {
      message: error.message,
      code: (error as { code?: string }).code,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
    });
    throw error;
  }
  const chosen = pickBusinessRow((data ?? []) as unknown as OwnBusinessRow[], user.id);
  if (!chosen) return null;
  const { user_id: _userId, ...business } = chosen;
  return business;
}

export async function fetchBusinessName(user: User): Promise<string> {
  const business = await fetchOwnBusiness(user);
  return business?.name ?? "Business";
}

export async function submitNeed(
  user: User,
  values: { role: string; timing: string; must_haves: string },
): Promise<Need> {
  const business = await fetchOwnBusiness(user);
  if (!business || business.status !== "approved") {
    throw new Error("business_not_approved");
  }
  const { data, error } = await supabase
    .from("needs")
    .insert({
      business_id: business.id,
      role: values.role,
      timing: values.timing,
      must_haves: values.must_haves.trim() || null,
      status: "in_review",
    })
    .select("*")
    .single();
  if (error) {
    console.error("submitNeed error", error);
    throw error;
  }
  const need = data as Need;

  // Fire-and-forget email notification — never block the user.
  void supabase.functions
    .invoke("notify-new-need", {
      body: {
        businessName: business.name,
        contactEmail: business.contact_email,
        role: need.role,
        timing: need.timing,
        mustHaves: need.must_haves,
        createdAt: need.created_at,
        dashboardUrl: typeof window !== "undefined" ? `${window.location.origin}/` : null,
      },
    })
    .then(({ error: fnErr }) => {
      if (fnErr) console.error("notify-new-need invoke error", fnErr);
    })
    .catch((e) => console.error("notify-new-need unexpected error", e));

  return need;
}

export async function fetchOpenNeeds(user: User): Promise<Need[]> {
  let biz: OwnBusiness | null;
  try {
    biz = await fetchOwnBusiness(user);
  } catch (bizErr) {
    console.error("fetchOpenNeeds business error", bizErr);
    return [];
  }
  if (!biz) return [];
  const { data, error } = await supabase
    .from("needs")
    .select("*")
    .eq("business_id", biz.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchOpenNeeds error", error);
    return [];
  }
  return (data ?? []) as Need[];
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(1, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Submitted ${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Submitted ${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Submitted yesterday";
  if (diffDay < 7) return `Submitted ${diffDay} days ago`;
  return `Submitted ${new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function formatStatus(status: string): string {
  return status
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
