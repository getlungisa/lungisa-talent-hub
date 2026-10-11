import { describe, expect, it } from "vitest";
import {
  FEE_TEXT,
  emptyJoinForm,
  isHoneypotTripped,
  validateJoinForm,
  type JoinFormValues,
} from "./joinValidation";

const valid: JoinFormValues = {
  businessName: "Corner Cafe",
  contactName: "Thandi Nkosi",
  email: "thandi@example.com",
  whatsapp: "+27 82 123 4567",
  area: "Sea Point",
  numberOfSites: "2",
  rolesHired: "Cashier, kitchen hand",
  websiteOrSocial: "@cornercafe",
  acceptTerms: true,
  acceptFee: true,
  honeypot: "",
};

describe("validateJoinForm", () => {
  it("accepts a complete form", () => {
    expect(validateJoinForm(valid)).toEqual({});
  });

  it("treats website or Instagram as optional", () => {
    expect(validateJoinForm({ ...valid, websiteOrSocial: "" })).toEqual({});
  });

  it("requires every other field and both checkboxes", () => {
    const errors = validateJoinForm(emptyJoinForm);
    expect(Object.keys(errors).sort()).toEqual(
      [
        "acceptFee",
        "acceptTerms",
        "area",
        "businessName",
        "contactName",
        "email",
        "rolesHired",
        "whatsapp",
      ].sort(),
    );
  });

  it("enforces length limits", () => {
    expect(validateJoinForm({ ...valid, businessName: "x".repeat(121) }).businessName).toBeDefined();
    expect(validateJoinForm({ ...valid, contactName: "x".repeat(101) }).contactName).toBeDefined();
    expect(validateJoinForm({ ...valid, area: "x".repeat(101) }).area).toBeDefined();
    expect(validateJoinForm({ ...valid, rolesHired: "x".repeat(301) }).rolesHired).toBeDefined();
    expect(validateJoinForm({ ...valid, websiteOrSocial: "x".repeat(201) }).websiteOrSocial).toBeDefined();
    expect(validateJoinForm({ ...valid, email: `${"a".repeat(250)}@b.co` }).email).toBeDefined();
  });

  it("rejects malformed email, phone, site counts and control characters", () => {
    expect(validateJoinForm({ ...valid, email: "nope" }).email).toBeDefined();
    expect(validateJoinForm({ ...valid, whatsapp: "call me" }).whatsapp).toBeDefined();
    expect(validateJoinForm({ ...valid, numberOfSites: "0" }).numberOfSites).toBeDefined();
    expect(validateJoinForm({ ...valid, numberOfSites: "1001" }).numberOfSites).toBeDefined();
    expect(validateJoinForm({ ...valid, numberOfSites: "1.5" }).numberOfSites).toBeDefined();
    expect(validateJoinForm({ ...valid, businessName: "Bad\u0000Name" }).businessName).toBeDefined();
    expect(validateJoinForm({ ...valid, websiteOrSocial: "two words" }).websiteOrSocial).toBeDefined();
  });

  it("detects the honeypot", () => {
    expect(isHoneypotTripped(valid)).toBe(false);
    expect(isHoneypotTripped({ ...valid, honeypot: "http://spam" })).toBe(true);
  });

  it("uses the exact fee wording", () => {
    expect(FEE_TEXT).toBe("R1,000 on hire. R3,000 at day 90, only if they're still with you.");
  });
});
