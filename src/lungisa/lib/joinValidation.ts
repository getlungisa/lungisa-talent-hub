export const JOIN_LIMITS = {
  businessName: { min: 2, max: 120 },
  contactName: { min: 2, max: 100 },
  email: { max: 254 },
  area: { min: 2, max: 100 },
  rolesHired: { min: 2, max: 300 },
  websiteOrSocial: { max: 200 },
  sites: { min: 1, max: 1000 },
} as const;

export const FEE_TEXT = "R1,000 on hire. R3,000 at day 90, only if they're still with you.";
export const TERMS_VERSION = "2026-10-v1";

export type JoinFormValues = {
  businessName: string;
  contactName: string;
  email: string;
  whatsapp: string;
  area: string;
  numberOfSites: string;
  rolesHired: string;
  websiteOrSocial: string;
  acceptTerms: boolean;
  acceptFee: boolean;
  // Honeypot: real people never see or fill this field.
  honeypot: string;
};

export type JoinFormErrors = Partial<Record<keyof JoinFormValues, string>>;

export const emptyJoinForm: JoinFormValues = {
  businessName: "",
  contactName: "",
  email: "",
  whatsapp: "",
  area: "",
  numberOfSites: "1",
  rolesHired: "",
  websiteOrSocial: "",
  acceptTerms: false,
  acceptFee: false,
  honeypot: "",
};

// Mirrors the checks inside the register_business database function.
const hasControlChars = (value: string) =>
  Array.from(value).some((c) => {
    const code = c.charCodeAt(0);
    return code < 32 || code === 127;
  });
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const WHATSAPP = /^\+?[0-9 ()-]{7,20}$/;

function checkText(
  value: string,
  label: string,
  min: number,
  max: number,
): string | undefined {
  const v = value.trim();
  if (v.length < min) return `Please enter ${label}.`;
  if (v.length > max) return `Keep this under ${max} characters.`;
  if (hasControlChars(v)) return "Please remove special characters.";
  return undefined;
}

export function validateJoinForm(values: JoinFormValues): JoinFormErrors {
  const errors: JoinFormErrors = {};
  const set = (key: keyof JoinFormValues, message: string | undefined) => {
    if (message) errors[key] = message;
  };

  set(
    "businessName",
    checkText(values.businessName, "your business name", JOIN_LIMITS.businessName.min, JOIN_LIMITS.businessName.max),
  );
  set(
    "contactName",
    checkText(values.contactName, "your name", JOIN_LIMITS.contactName.min, JOIN_LIMITS.contactName.max),
  );

  const email = values.email.trim();
  if (!EMAIL.test(email) || email.length > JOIN_LIMITS.email.max) {
    errors.email = "Please enter a valid email address.";
  }

  if (!WHATSAPP.test(values.whatsapp.trim())) {
    errors.whatsapp = "Please enter a valid WhatsApp number.";
  }

  set("area", checkText(values.area, "your area", JOIN_LIMITS.area.min, JOIN_LIMITS.area.max));
  set(
    "rolesHired",
    checkText(values.rolesHired, "the roles you hire for", JOIN_LIMITS.rolesHired.min, JOIN_LIMITS.rolesHired.max),
  );

  const sites = values.numberOfSites.trim();
  const sitesNumber = Number(sites);
  if (
    !/^\d{1,4}$/.test(sites) ||
    sitesNumber < JOIN_LIMITS.sites.min ||
    sitesNumber > JOIN_LIMITS.sites.max
  ) {
    errors.numberOfSites = `Enter a number between ${JOIN_LIMITS.sites.min} and ${JOIN_LIMITS.sites.max}.`;
  }

  const web = values.websiteOrSocial.trim();
  if (web) {
    if (web.length > JOIN_LIMITS.websiteOrSocial.max) {
      errors.websiteOrSocial = `Keep this under ${JOIN_LIMITS.websiteOrSocial.max} characters.`;
    } else if (hasControlChars(web) || /\s/.test(web)) {
      errors.websiteOrSocial = "Enter a website or Instagram handle, without spaces.";
    }
  }

  if (!values.acceptTerms) errors.acceptTerms = "Please accept the terms and privacy policy.";
  if (!values.acceptFee) errors.acceptFee = "Please confirm you're happy with the fee.";

  return errors;
}

export function isHoneypotTripped(values: JoinFormValues): boolean {
  return values.honeypot.trim().length > 0;
}
