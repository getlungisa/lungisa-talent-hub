import { beforeEach, describe, expect, it, vi } from "vitest";

const { orderMock, selectMock, fromMock, eqMock, maybeSingleMock } = vi.hoisted(() => {
  const orderMock = vi.fn();
  const maybeSingleMock = vi.fn();
  const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
  const selectMock = vi.fn(() => ({ order: orderMock, eq: eqMock, maybeSingle: maybeSingleMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));

  return { orderMock, selectMock, fromMock, eqMock, maybeSingleMock };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: fromMock,
  },
}));

import { fetchCandidate, fetchCandidates } from "./dashboard";

describe("fetchCandidates", () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    orderMock.mockReset();
    eqMock.mockReset();
    maybeSingleMock.mockReset();
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
