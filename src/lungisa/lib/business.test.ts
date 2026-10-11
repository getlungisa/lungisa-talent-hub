import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { invokeMock, rpcMock } = vi.hoisted(() => ({ invokeMock: vi.fn(), rpcMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: invokeMock }, rpc: rpcMock },
}));

import { registerBusiness, type RegistrationDraft } from "./business";

const draft: RegistrationDraft = {
  businessName: "Acme",
  contactName: "Owner",
  email: "o@example.com",
  whatsapp: "0821234567",
  area: "Sea Point",
  numberOfSites: "1",
  rolesHired: "Cashier",
  websiteOrSocial: "",
  acceptTerms: true,
  acceptFee: true,
} as RegistrationDraft;

describe("registerBusiness", () => {
  beforeEach(() => {
    rpcMock.mockReset().mockResolvedValue({ data: "biz-1", error: null });
    invokeMock.mockReset().mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("invokes notify-new-business with the new business id", async () => {
    await expect(registerBusiness(draft)).resolves.toBe("biz-1");
    expect(rpcMock).toHaveBeenCalledWith("register_business", expect.any(Object));
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("notify-new-business", { body: { businessId: "biz-1" } });
  });

  it("does not invoke the alert when registration fails", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "nope" } });
    await expect(registerBusiness(draft)).rejects.toThrow("nope");
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("logs a returned invoke error without blocking registration", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = { message: "bad" };
    invokeMock.mockResolvedValue({ data: null, error: err });
    await expect(registerBusiness(draft)).resolves.toBe("biz-1");
    await vi.waitFor(() => expect(spy).toHaveBeenCalledWith("notify-new-business invoke error", err));
  });

  it("logs a rejected invoke without blocking registration", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("network");
    invokeMock.mockRejectedValue(err);
    await expect(registerBusiness(draft)).resolves.toBe("biz-1");
    await vi.waitFor(() => expect(spy).toHaveBeenCalledWith("notify-new-business unexpected error", err));
  });

  it("logs a synchronous invoke throw without blocking registration", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("sync");
    invokeMock.mockImplementation(() => {
      throw err;
    });
    await expect(registerBusiness(draft)).resolves.toBe("biz-1");
    expect(spy).toHaveBeenCalledWith("notify-new-business unexpected error", err);
  });
});
