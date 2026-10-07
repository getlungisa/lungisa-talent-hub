import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const { orderMock, selectMock, fromMock, eqMock, orMock, maybeSingleMock, rpcMock } = vi.hoisted(() => {
  const orderMock = vi.fn();
  const maybeSingleMock = vi.fn();
  const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock, order: orderMock }));
  const orMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
  const selectMock = vi.fn(() => ({ order: orderMock, eq: eqMock, or: orMock, maybeSingle: maybeSingleMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  const rpcMock = vi.fn();

  return { orderMock, selectMock, fromMock, eqMock, orMock, maybeSingleMock, rpcMock };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

import {
  fetchCandidate,
  fetchCandidates,
  fetchDashboardShortlisted,
  toggleCandidateShortlist,
} from "./dashboard";

describe("fetchCandidates", () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    orderMock.mockReset();
    eqMock.mockReset();
    orMock.mockReset();
    maybeSingleMock.mockReset();
    rpcMock.mockReset();
  });

  it("loads candidates from Supabase", async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          id: "1",
          name: "Ayanda",
          location: "Langa, Cape Town",
          strengths_summary: "Warm, thoughtful, and composed under pressure.",
        },
      ],
      error: null,
    });

    await expect(fetchCandidates()).resolves.toEqual([
      {
        id: "1",
        name: "Ayanda",
        location: "Langa, Cape Town",
        strengths_summary: "Warm, thoughtful, and composed under pressure.",
      },
    ]);

    expect(fromMock).toHaveBeenCalledWith("candidates");
    expect(selectMock).toHaveBeenCalledWith("id, name, location, strengths_summary");
    expect(orderMock).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("throws when Supabase returns an error", async () => {
    const error = new Error("boom");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    orderMock.mockResolvedValue({
      data: null,
      error,
    });

    await expect(fetchCandidates()).rejects.toBe(error);
    expect(consoleErrorSpy).toHaveBeenCalledWith("fetchCandidates error", error);

    consoleErrorSpy.mockRestore();
  });
});

describe("fetchCandidate", () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    orderMock.mockReset();
    eqMock.mockReset();
    orMock.mockReset();
    maybeSingleMock.mockReset();
    rpcMock.mockReset();
  });

  it("loads a single candidate by id from Supabase", async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        id: "1",
        name: "Ayanda",
        location: "Langa, Cape Town",
        strengths_summary: "Warm, thoughtful, and composed under pressure.",
        reference_note: null,
      },
      error: null,
    });

    await expect(fetchCandidate("1")).resolves.toEqual({
      id: "1",
      name: "Ayanda",
      location: "Langa, Cape Town",
      strengths_summary: "Warm, thoughtful, and composed under pressure.",
      reference_note: null,
    });

    expect(fromMock).toHaveBeenCalledWith("candidates");
    expect(selectMock).toHaveBeenCalledWith(
      "id, name, location, strengths_summary, training_partner_id, training_partner:businesses!candidates_training_partner_id_fkey(name), reference_note",
    );
    expect(eqMock).toHaveBeenCalledWith("id", "1");
  });
});

describe("toggleCandidateShortlist", () => {
  const user = { id: "user-1" } as never;

  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    orderMock.mockReset();
    eqMock.mockReset();
    orMock.mockReset();
    maybeSingleMock.mockReset();
    rpcMock.mockReset();
  });

  it("resolves the business and calls the shortlist toggle RPC", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: { id: "business-1" },
      error: null,
    });
    rpcMock.mockResolvedValue({
      data: true,
      error: null,
    });

    await expect(toggleCandidateShortlist(user, "candidate-1", false)).resolves.toBe(true);

    expect(fromMock).toHaveBeenCalledWith("businesses");
    expect(selectMock).toHaveBeenCalledWith("id, is_training_partner");
    expect(orMock).toHaveBeenCalledWith("user_id.eq.user-1,secondary_user_id.eq.user-1");
    expect(rpcMock).toHaveBeenCalledWith("toggle_candidate_shortlist", {
      p_business_id: "business-1",
      p_candidate_id: "candidate-1",
      p_currently_shortlisted: false,
    });
  });

  it("normalizes conflicts when the candidate allocation is no longer available", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: { id: "business-1" },
      error: null,
    });
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "candidate_already_claimed" },
    });

    await expect(toggleCandidateShortlist(user, "candidate-1", false)).rejects.toMatchObject({
      message: "candidate_already_claimed",
    });
  });

  it("rethrows generic RPC errors after logging them", async () => {
    const error = { message: "boom" };
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    maybeSingleMock.mockResolvedValueOnce({
      data: { id: "business-1" },
      error: null,
    });
    rpcMock.mockResolvedValue({
      data: null,
      error,
    });

    await expect(toggleCandidateShortlist(user, "candidate-1", true)).rejects.toBe(error);
    expect(consoleErrorSpy).toHaveBeenCalledWith("toggleCandidateShortlist error", error);

    consoleErrorSpy.mockRestore();
  });

  it("rejects invalid successful RPC responses that omit a boolean result", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    maybeSingleMock.mockResolvedValueOnce({
      data: { id: "business-1" },
      error: null,
    });
    rpcMock.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(toggleCandidateShortlist(user, "candidate-1", true)).rejects.toMatchObject({
      message: "invalid_shortlist_toggle_response",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "toggleCandidateShortlist error",
      expect.objectContaining({ message: "invalid_shortlist_toggle_response" }),
    );

    consoleErrorSpy.mockRestore();
  });

  it("rejects when the current user has no business record", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await expect(toggleCandidateShortlist(user, "candidate-1", false)).rejects.toMatchObject({
      message: "business_not_found",
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe("fetchDashboardShortlisted", () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    orderMock.mockReset();
    eqMock.mockClear();
    orMock.mockClear();
    maybeSingleMock.mockReset();
    rpcMock.mockReset();
  });

  it("reads each business's private shortlist and retains candidates hidden by RLS", async () => {
    maybeSingleMock
      .mockResolvedValueOnce({ data: { id: "business-a" }, error: null })
      .mockResolvedValueOnce({ data: { id: "business-b" }, error: null });
    orderMock
      .mockResolvedValueOnce({
        data: [
          {
            candidate_id: "candidate-hidden",
            created_at: "2026-10-01T00:00:00Z",
            candidates: null,
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            candidate_id: "candidate-visible",
            created_at: "2026-10-02T00:00:00Z",
            candidates: {
              id: "candidate-visible",
              name: "Ayanda",
              location: "Langa",
            },
          },
        ],
        error: null,
      });

    await expect(fetchDashboardShortlisted({ id: "user-a" } as never)).resolves.toEqual([
      {
        candidateId: "candidate-hidden",
        candidateName: null,
        location: null,
        isAvailable: false,
        createdAt: "2026-10-01T00:00:00Z",
      },
    ]);
    await expect(fetchDashboardShortlisted({ id: "user-b" } as never)).resolves.toEqual([
      {
        candidateId: "candidate-visible",
        candidateName: "Ayanda",
        location: "Langa",
        isAvailable: true,
        createdAt: "2026-10-02T00:00:00Z",
      },
    ]);

    expect(fromMock).toHaveBeenNthCalledWith(1, "businesses");
    expect(fromMock).toHaveBeenNthCalledWith(2, "shortlists");
    expect(fromMock).toHaveBeenNthCalledWith(3, "businesses");
    expect(fromMock).toHaveBeenNthCalledWith(4, "shortlists");
    expect(selectMock).toHaveBeenCalledWith(
      "candidate_id, created_at, candidates!shortlists_candidate_id_fkey(id, name, location)",
    );
    expect(eqMock).toHaveBeenNthCalledWith(1, "business_id", "business-a");
    expect(eqMock).toHaveBeenNthCalledWith(2, "business_id", "business-b");
  });
});

describe("shortlist SQL contract", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20261007000000_shortlist_redesign.sql"),
    "utf8",
  );
  const rollback = readFileSync(
    resolve(process.cwd(), "supabase/rollback/20261007_shortlist_redesign_rollback.sql"),
    "utf8",
  );

  it("creates private independent shortlists and keeps the RPC away from allocations", () => {
    expect(migration.trimStart()).toMatch(/^BEGIN;/);
    expect(migration.trimEnd()).toMatch(/COMMIT;$/);
    expect(migration).toMatch(/UNIQUE \(business_id, candidate_id\)/);
    expect(migration).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/FOR SELECT TO authenticated/);
    expect(migration).toMatch(/USING \(public\.user_can_access_business\(business_id\)\)/);
    expect(migration).toMatch(/REVOKE ALL ON TABLE public\.shortlists FROM PUBLIC, anon, authenticated/);
    expect(migration).not.toMatch(/GRANT (INSERT|UPDATE|DELETE|ALL).*shortlists/i);
    expect(migration.match(/CREATE POLICY/gi)).toHaveLength(1);
    expect(migration).not.toMatch(/(?:ALTER|DROP) POLICY/i);
    expect(migration).toMatch(/business_id,\s*candidate_id,\s*created_at\s+FROM public\.candidate_allocations/is);
    expect(migration).toMatch(/allocated_at = NULL,\s*need_id = NULL/is);
    expect(migration).toMatch(/status = 'available'/);
    expect(migration).toMatch(/candidate_already_claimed/);
    expect(migration).toMatch(/business_not_found/);
    expect(migration).toMatch(/ON CONFLICT \(business_id, candidate_id\) DO NOTHING/);

    const rpc = migration.split("CREATE OR REPLACE FUNCTION public.toggle_candidate_shortlist")[1];
    expect(rpc).not.toMatch(/UPDATE public\.candidate_allocations/i);
    expect(rpc).not.toMatch(/INSERT INTO public\.candidate_allocations/i);
    expect(rpc).not.toMatch(/DELETE FROM public\.candidate_allocations/i);
  });

  it("restores the live allocated_at function and drops only the new table", () => {
    expect(rollback).toMatch(/allocated_at = NULL/);
    expect(rollback).toMatch(/allocated_at = now\(\)/);
    expect(rollback).toMatch(/DROP TABLE IF EXISTS public\.shortlists/);
    expect(rollback).toMatch(/REVOKE ALL[\s\S]+FROM PUBLIC, anon/);
    expect(rollback).toMatch(/GRANT EXECUTE[\s\S]+TO authenticated/);
    expect(rollback).not.toMatch(/allocation_date/);
    expect(rollback).not.toMatch(/CREATE POLICY|DROP POLICY/);
  });
});
