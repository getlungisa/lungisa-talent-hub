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

export async function ensureBusiness(user: User): Promise<{ id: string; name: string; contact_email: string }> {
  const { data: existing, error: selErr } = await supabase
    .from("businesses")
    .select("id, name, contact_email")
    .eq("user_id", user.id)
    .maybeSingle();
  if (selErr) {
    console.error("ensureBusiness select error", selErr);
    throw selErr;
  }
  if (existing) return existing;

  const email = user.email ?? "";
  const placeholderName = `Business ${email.split("@")[0] || "Owner"}`;
  const { data: inserted, error: insErr } = await supabase
    .from("businesses")
    .insert({
      user_id: user.id,
      name: placeholderName,
      contact_email: email,
    })
    .select("id, name, contact_email")
    .single();
  if (insErr) {
    console.error("ensureBusiness insert error", insErr);
    throw insErr;
  }
  return inserted;
}

export async function submitNeed(
  user: User,
  values: { role: string; timing: string; must_haves: string },
): Promise<Need> {
  const business = await ensureBusiness(user);
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
  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (bizErr) {
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
