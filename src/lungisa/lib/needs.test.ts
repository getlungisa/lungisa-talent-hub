import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  eqMock,
  fromMock,
  insertMock,
  maybeSingleMock,
  orMock,
  selectAfterInsertMock,
  selectMock,
  singleMock,
} = vi.hoisted(() => {
  const maybeSingleMock = vi.fn();
  const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
  const orMock = vi.fn();
  const selectMock = vi.fn(() => ({ eq: eqMock, or: orMock }));

  const singleMock = vi.fn();
  const selectAfterInsertMock = vi.fn(() => ({ single: singleMock }));
  const insertMock = vi.fn(() => ({ select: selectAfterInsertMock }));

  const fromMock = vi.fn((table: string) => {
    if (table === "businesses") {
      return {
        select: selectMock,
        insert: insertMock,
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return {
    eqMock,
    fromMock,
    insertMock,
    maybeSingleMock,
    orMock,
    selectAfterInsertMock,
    selectMock,
    singleMock,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: fromMock,
  },
}));

import { fetchBusinessName, fetchOwnBusiness } from "./needs";

describe("fetchOwnBusiness", () => {
  const user = { id: "user-1", email: "owner@example.com" } as never;
  const row = (id: string, status: string, user_id: string, name = id) => ({
    id,
    name,
    status,
    user_id,
    contact_email: "owner@example.com",
  });
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    eqMock.mockReset();
    orMock.mockReset();
    maybeSingleMock.mockReset();
    insertMock.mockReset();
    selectAfterInsertMock.mockReset();
    singleMock.mockReset();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("loads a single business using the quoted contact-email column alias and status", async () => {
    orMock.mockResolvedValue({ data: [row("business-1", "approved", "user-1", "Acme")], error: null });

    await expect(fetchOwnBusiness(user)).resolves.toEqual({
      id: "business-1",
      name: "Acme",
      status: "approved",
      contact_email: "owner@example.com",
    });

    expect(fromMock).toHaveBeenCalledWith("businesses");
    expect(selectMock).toHaveBeenCalledWith('id, name, status, user_id, contact_email:"contact email"');
    expect(orMock).toHaveBeenCalledWith("user_id.eq.user-1,secondary_user_id.eq.user-1");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns null and never inserts a business when none exists", async () => {
    orMock.mockResolvedValue({ data: [], error: null });

    await expect(fetchOwnBusiness(user)).resolves.toBeNull();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("prefers the row where the user is the primary owner and warns with all ids", async () => {
    orMock.mockResolvedValue({
      data: [row("b-second", "approved", "other"), row("b-primary", "pending", "user-1")],
      error: null,
    });

    await expect(fetchOwnBusiness(user)).resolves.toMatchObject({ id: "b-primary" });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0].join(" ")).toContain("b-second");
    expect(warnSpy.mock.calls[0].join(" ")).toContain("b-primary");
  });

  it("falls back to the first approved row when the user owns none", async () => {
    orMock.mockResolvedValue({
      data: [row("b-pending", "pending", "other"), row("b-ok", "approved", "other2"), row("b-ok2", "approved", "o3")],
      error: null,
    });

    await expect(fetchOwnBusiness(user)).resolves.toMatchObject({ id: "b-ok" });
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to the first row when none is owned or approved", async () => {
    orMock.mockResolvedValue({
      data: [row("b-1", "pending", "other"), row("b-2", "rejected", "o2")],
      error: null,
    });

    await expect(fetchOwnBusiness(user)).resolves.toMatchObject({ id: "b-1", status: "pending" });
  });

  it("does not leak the internal user_id column", async () => {
    orMock.mockResolvedValue({ data: [row("b", "approved", "user-1")], error: null });
    expect(await fetchOwnBusiness(user)).not.toHaveProperty("user_id");
  });

  it("logs message and code, then throws on query errors", async () => {
    const err = { message: "boom", code: "42501" };
    orMock.mockResolvedValue({ data: null, error: err });
    await expect(fetchOwnBusiness(user)).rejects.toBe(err);
    expect(errorSpy).toHaveBeenCalledWith(
      "fetchOwnBusiness error",
      expect.objectContaining({ message: "boom", code: "42501" }),
    );
  });

  it("returns the business name for header consumers", async () => {
    orMock.mockResolvedValue({ data: [row("business-1", "approved", "user-1", "Acme")], error: null });

    await expect(fetchBusinessName(user)).resolves.toBe("Acme");
    expect(insertMock).not.toHaveBeenCalled();
  });
});
