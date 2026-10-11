import { supabase } from "@/integrations/supabase/client";
import { TERMS_VERSION, type JoinFormValues } from "./joinValidation";

type RpcResult<T> = Promise<{ data: T | null; error: { message?: string } | null }>;

// The generated Supabase types predate these functions; keep the RPC calls
// typed locally (same approach as dashboard.ts).
const rpc = supabase as unknown as {
  rpc: <T = unknown>(fn: string, args?: Record<string, unknown>) => RpcResult<T>;
};

export type PendingBusiness = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string;
  whatsapp_number: string | null;
  area: string | null;
  number_of_sites: number | null;
  roles_hired: string | null;
  website_or_social: string | null;
  created_at: string;
};

export type RegistrationDraft = Omit<JoinFormValues, "honeypot">;

const DRAFT_KEY = "lungisa:pending-registration";
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function saveRegistrationDraft(values: JoinFormValues): void {
  const { honeypot: _honeypot, ...draft } = values;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), draft }));
  } catch {
    // Storage unavailable: the user can simply submit the form again.
  }
}

export function loadRegistrationDraft(): RegistrationDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; draft?: RegistrationDraft };
    if (!parsed.draft || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      clearRegistrationDraft();
      return null;
    }
    return parsed.draft;
  } catch {
    return null;
  }
}

export function clearRegistrationDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export async function registerBusiness(values: RegistrationDraft): Promise<string> {
  const { data, error } = await rpc.rpc<string>("register_business", {
    p_business_name: values.businessName.trim(),
    p_contact_name: values.contactName.trim(),
    p_whatsapp_number: values.whatsapp.trim(),
    p_area: values.area.trim(),
    p_number_of_sites: Number(values.numberOfSites),
    p_roles_hired: values.rolesHired.trim(),
    p_website_or_social: values.websiteOrSocial.trim() || null,
    p_terms_version: TERMS_VERSION,
    p_terms_accepted: values.acceptTerms,
    p_fee_accepted: values.acceptFee,
  });
  if (error) {
    throw new Error(error.message ?? "register_business_failed");
  }
  return data as string;
}

export async function fetchIsAdmin(): Promise<boolean> {
  const { data, error } = await rpc.rpc<boolean>("current_user_is_admin");
  if (error) return false;
  return data === true;
}

export async function fetchPendingBusinesses(): Promise<PendingBusiness[]> {
  const { data, error } = await rpc.rpc<PendingBusiness[]>("admin_list_pending_businesses");
  if (error) throw new Error(error.message ?? "admin_list_failed");
  return data ?? [];
}

export async function setBusinessStatus(
  businessId: string,
  status: "approved" | "rejected",
): Promise<void> {
  const { error } = await rpc.rpc("admin_set_business_status", {
    p_business_id: businessId,
    p_status: status,
  });
  if (error) throw new Error(error.message ?? "admin_set_status_failed");
}
