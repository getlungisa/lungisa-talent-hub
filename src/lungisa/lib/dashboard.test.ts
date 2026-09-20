import { beforeEach, describe, expect, it, vi } from "vitest";

const { orderMock, selectMock, fromMock, eqMock, maybeSingleMock, rpcMock } = vi.hoisted(() => {
  const orderMock = vi.fn();
  const maybeSingleMock = vi.fn();
  const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
  const selectMock = vi.fn(() => ({ order: orderMock, eq: eqMock, maybeSingle: maybeSingleMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  const rpcMock = vi.fn();

  return { orderMock, selectMock, fromMock, eqMock, maybeSingleMock, rpcMock };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

import { fetchCandidate, fetchCandidates, toggleCandidateShortlist } from "./dashboard";

describe("fetchCandidates", () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    orderMock.mockReset();
    eqMock.mockReset();
    maybeSingleMock.mockReset();
    rpcMock.mockReset();
  });

  it("loads candidates from Supabase", async () => {
    orderMock.mockResolvedValue({
      data: [{ id: "1", name: "Ayanda", location: "Langa, Cape Town" }],
      error: null,
    });

    await expect(fetchCandidates()).resolves.toEqual([
      { id: "1", name: "Ayanda", location: "Langa, Cape Town" },
    ]);

    expect(fromMock).toHaveBeenCalledWith("candidates");
    expect(selectMock).toHaveBeenCalledWith("id, name, location");
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
    maybeSingleMock.mockReset();
    rpcMock.mockReset();
  });

  it("loads a single candidate by id from Supabase", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { id: "1", name: "Ayanda", location: "Langa, Cape Town" },
      error: null,
    });

    await expect(fetchCandidate("1")).resolves.toEqual({
      id: "1",
      name: "Ayanda",
      location: "Langa, Cape Town",
    });

    expect(fromMock).toHaveBeenCalledWith("candidates");
    expect(selectMock).toHaveBeenCalledWith("id, name, location");
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
    expect(selectMock).toHaveBeenCalledWith("id");
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(rpcMock).toHaveBeenCalledWith("toggle_candidate_shortlist", {
      p_business_id: "business-1",
      p_candidate_id: "candidate-1",
      p_currently_shortlisted: false,
    });
  });

  it("normalizes allocation conflicts from the RPC", async () => {
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
});
