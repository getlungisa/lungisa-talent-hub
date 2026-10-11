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
  const orMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
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

  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    eqMock.mockReset();
    orMock.mockReset();
    maybeSingleMock.mockReset();
    insertMock.mockReset();
    selectAfterInsertMock.mockReset();
    singleMock.mockReset();
  });

  it("loads an existing business using the quoted contact-email column alias and status", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { id: "business-1", name: "Acme", status: "approved", contact_email: "owner@example.com" },
      error: null,
    });

    await expect(fetchOwnBusiness(user)).resolves.toEqual({
      id: "business-1",
      name: "Acme",
      status: "approved",
      contact_email: "owner@example.com",
    });

    expect(fromMock).toHaveBeenCalledWith("businesses");
    expect(selectMock).toHaveBeenCalledWith('id, name, status, contact_email:"contact email"');
    expect(orMock).toHaveBeenCalledWith("user_id.eq.user-1,secondary_user_id.eq.user-1");
  });

  it("returns null and never inserts a business when none exists", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    await expect(fetchOwnBusiness(user)).resolves.toBeNull();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("throws on query errors", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(fetchOwnBusiness(user)).rejects.toThrow("boom");
  });

  it("returns the business name for header consumers", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { id: "business-1", name: "Acme", status: "approved", contact_email: "owner@example.com" },
      error: null,
    });

    await expect(fetchBusinessName(user)).resolves.toBe("Acme");
    expect(insertMock).not.toHaveBeenCalled();
  });
});
