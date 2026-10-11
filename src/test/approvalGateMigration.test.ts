import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Static guard-rails over the SQL. The behavioural policy/function checks live
// in supabase/tests/business_approval_gate_verification.sql, which must be run
// against a database (psql) after the migration.
const root = path.resolve(__dirname, "../../supabase");
const migration = readFileSync(path.join(root, "migrations/20261011000000_business_approval_gate.sql"), "utf8");
const rollback = readFileSync(path.join(root, "rollback/20261011_business_approval_gate_rollback.sql"), "utf8");
const verification = readFileSync(path.join(root, "tests/business_approval_gate_verification.sql"), "utf8");

const candidateTables = [
  "candidates",
  "candidate_allocations",
  "placements",
  "shortlists",
  "business_activity",
  "candidate_references",
  "verification_stages",
  "signals",
  "behavioural_tasks",
  "retention_tracking",
];

describe("business approval gate migration", () => {
  it("gates every candidate-derived table with the approved-business helper", () => {
    for (const table of candidateTables) {
      expect(migration).toContain(`'${table}'`);
      expect(rollback).toContain(`'${table}'`);
      expect(verification).toContain(`'${table}'`);
    }
    expect(migration).toMatch(/AS RESTRICTIVE FOR ALL TO public/);
    expect(migration).toMatch(/USING \(public\.user_has_approved_business\(\)\)/);
  });

  it("covers both primary and secondary users in the helper", () => {
    const helper = migration.slice(migration.indexOf("FUNCTION public.user_has_approved_business()"));
    const body = helper.slice(0, helper.indexOf("$$;", helper.indexOf("AS $$")));
    expect(body).toContain("status = 'approved'");
    expect(body).toContain("user_id = auth.uid()");
    expect(body).toContain("secondary_user_id = auth.uid()");
  });

  it("requires an approved business in toggle_candidate_shortlist", () => {
    const start = migration.indexOf("FUNCTION public.toggle_candidate_shortlist");
    const body = migration.slice(start, migration.indexOf("$$;", start + 200));
    expect(body).toContain("user_can_access_approved_business(p_business_id)");
    expect(body).toContain("business_not_approved");
  });

  it("defaults new businesses to pending and backfills existing rows as approved", () => {
    expect(migration).toContain("ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'");
    expect(migration).toContain("ALTER COLUMN status SET DEFAULT 'pending'");
    expect(migration).toContain("CHECK (status IN ('pending', 'approved', 'rejected'))");
  });

  it("removes direct INSERT and status/ownership UPDATE from normal users", () => {
    expect(migration).toContain("REVOKE INSERT, DELETE ON TABLE public.businesses FROM PUBLIC, anon, authenticated");
    const grant = migration.slice(migration.indexOf("GRANT UPDATE ("), migration.indexOf("TO authenticated;", migration.indexOf("GRANT UPDATE (")));
    for (const protectedColumn of ["status", "user_id", "terms_accepted_at", "terms_version", "status_changed_by", "status_changed_at"]) {
      expect(grant).not.toMatch(new RegExp(`\\b${protectedColumn}\\b`));
    }
  });

  it("keeps admin functions admin-only, fixed search_path and not executable by anon", () => {
    for (const fn of ["admin_set_business_status", "admin_list_pending_businesses", "admin_create_business"]) {
      const start = migration.indexOf(`FUNCTION public.${fn}`);
      const body = migration.slice(start, migration.indexOf("$$;", migration.indexOf("AS $$", start)));
      expect(body).toContain("SECURITY DEFINER");
      expect(body).toContain("SET search_path = public, pg_temp");
      expect(body).toContain("public.current_user_is_admin()");
      expect(migration).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\) FROM PUBLIC, anon, authenticated`));
    }
  });

  it("register_business takes no status or owner arguments", () => {
    const start = migration.indexOf("FUNCTION public.register_business(");
    const signature = migration.slice(start, migration.indexOf("RETURNS UUID", start));
    expect(signature).not.toMatch(/status|owner|user_id/i);
    expect(migration).toContain("v_uid UUID := auth.uid()");
    expect(migration).toContain("'pending'");
  });

  it("verification script checks the whatsapp_number grant behaviourally", () => {
    expect(verification).toContain("candidates', 'whatsapp_number'");
  });
});
