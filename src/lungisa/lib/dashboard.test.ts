import { beforeEach, describe, expect, it, vi } from "vitest";

const { orderMock, selectMock, fromMock } = vi.hoisted(() => {
  const orderMock = vi.fn();
  const selectMock = vi.fn(() => ({ order: orderMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));

  return { orderMock, selectMock, fromMock };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: fromMock,
  },
}));

import { fetchCandidates } from "./dashboard";

describe("fetchCandidates", () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    orderMock.mockReset();
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

  it("returns an empty list when Supabase returns an error", async () => {
    const error = new Error("boom");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    orderMock.mockResolvedValue({
      data: null,
      error,
    });

    await expect(fetchCandidates()).resolves.toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("fetchCandidates error", error);

    consoleErrorSpy.mockRestore();
  });
});
