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

import { ensureBusiness, fetchBusinessName } from "./needs";

describe("ensureBusiness", () => {
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

  it("loads an existing business using the quoted contact-email column alias", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { id: "business-1", name: "Acme", contact_email: "owner@example.com" },
      error: null,
    });

    await expect(ensureBusiness(user)).resolves.toEqual({
      id: "business-1",
      name: "Acme",
      contact_email: "owner@example.com",
    });

    expect(fromMock).toHaveBeenCalledWith("businesses");
    expect(selectMock).toHaveBeenCalledWith('id, name, contact_email:"contact email"');
    expect(orMock).toHaveBeenCalledWith("user_id.eq.user-1,secondary_user_id.eq.user-1");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("creates a business with the quoted contact-email column when one does not exist", async () => {
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });
    singleMock.mockResolvedValue({
      data: { id: "business-2", name: "Business owner", contact_email: "owner@example.com" },
      error: null,
    });

    await expect(ensureBusiness(user)).resolves.toEqual({
      id: "business-2",
      name: "Business owner",
      contact_email: "owner@example.com",
    });

    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-1",
      name: "Business owner",
      "contact email": "owner@example.com",
    });
    expect(selectAfterInsertMock).toHaveBeenCalledWith('id, name, contact_email:"contact email"');
  });

  it("returns the business name for header consumers", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { id: "business-1", name: "Acme", contact_email: "owner@example.com" },
      error: null,
    });

    await expect(fetchBusinessName(user)).resolves.toBe("Acme");
  });
});
