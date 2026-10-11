import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FEE_TEXT,
  JOIN_LIMITS,
  emptyJoinForm,
  isHoneypotTripped,
  validateJoinForm,
  type JoinFormErrors,
  type JoinFormValues,
} from "@/lungisa/lib/joinValidation";
import {
  clearRegistrationDraft,
  loadRegistrationDraft,
  registerBusiness,
  saveRegistrationDraft,
} from "@/lungisa/lib/business";

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function Join() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<JoinFormValues>(emptyJoinForm);
  const [errors, setErrors] = useState<JoinFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Back from the magic link with a saved sign-up: create the pending business.
  useEffect(() => {
    if (!session) return;
    const draft = loadRegistrationDraft(session.user?.email);
    if (!draft) return;
    let cancelled = false;

    const finish = async () => {
      setSubmitting(true);
      try {
        await registerBusiness(draft);
        clearRegistrationDraft();
        if (!cancelled) navigate("/", { replace: true });
      } catch (e) {
        if (cancelled) return;
        if (e instanceof Error && e.message === "business_already_exists") {
          clearRegistrationDraft();
          navigate("/", { replace: true });
          return;
        }
        console.error("registerBusiness error", e);
        setFormError("We couldn't save your details. Please try again.");
        setSubmitting(false);
      }
    };

    void finish();
    return () => {
      cancelled = true;
    };
  }, [session, navigate]);

  const update = <K extends keyof JoinFormValues>(key: K, value: JoinFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const found = validateJoinForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // Bots fill the hidden field. Behave as if it worked, but do nothing.
    if (isHoneypotTripped(values)) {
      setSent(true);
      return;
    }

    setSubmitting(true);
    try {
      if (session) {
        await registerBusiness(values);
        navigate("/", { replace: true });
        return;
      }

      saveRegistrationDraft(values);
      const { error } = await supabase.auth.signInWithOtp({
        email: values.email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/join`,
        },
      });
      if (error) {
        console.error("signInWithOtp error", error);
        clearRegistrationDraft();
        setFormError("We couldn't send your email link. Please check your email address and try again.");
      } else {
        setSent(true);
      }
    } catch (err) {
      if (err instanceof Error && err.message === "business_already_exists") {
        navigate("/", { replace: true });
        return;
      }
      console.error("join submit error", err);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </main>
    );
  }

  if (session && submitting) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Saving your details...</p>
      </main>
    );
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 space-y-4">
          <h1 className="font-display text-3xl text-foreground">Check your email</h1>
          <p className="text-sm text-foreground">
            We've sent a link to confirm your email. Open it on this device to finish joining.
          </p>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="underline" to="/sign-in">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <h1 className="font-display text-3xl text-foreground">Join Lungisa</h1>
            <p className="text-muted-foreground text-sm">
              Tell us about your business. We'll check your details and email you once you're approved.
            </p>
          </div>

          <Field id="businessName" label="Business name" error={errors.businessName}>
            <Input
              id="businessName"
              autoComplete="organization"
              maxLength={JOIN_LIMITS.businessName.max}
              value={values.businessName}
              onChange={(e) => update("businessName", e.target.value)}
            />
          </Field>
          <Field id="contactName" label="Your name" error={errors.contactName}>
            <Input
              id="contactName"
              autoComplete="name"
              maxLength={JOIN_LIMITS.contactName.max}
              value={values.contactName}
              onChange={(e) => update("contactName", e.target.value)}
            />
          </Field>
          <Field id="email" label="Email" error={errors.email}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              maxLength={JOIN_LIMITS.email.max}
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Field id="whatsapp" label="WhatsApp number" error={errors.whatsapp}>
            <Input
              id="whatsapp"
              type="tel"
              autoComplete="tel"
              maxLength={20}
              value={values.whatsapp}
              onChange={(e) => update("whatsapp", e.target.value)}
              placeholder="082 123 4567"
            />
          </Field>
          <Field id="area" label="Area" error={errors.area}>
            <Input
              id="area"
              maxLength={JOIN_LIMITS.area.max}
              value={values.area}
              onChange={(e) => update("area", e.target.value)}
              placeholder="e.g. Sea Point, Cape Town"
            />
          </Field>
          <Field id="numberOfSites" label="Number of sites" error={errors.numberOfSites}>
            <Input
              id="numberOfSites"
              inputMode="numeric"
              maxLength={4}
              value={values.numberOfSites}
              onChange={(e) => update("numberOfSites", e.target.value)}
            />
          </Field>
          <Field id="rolesHired" label="Roles you hire for" error={errors.rolesHired}>
            <Input
              id="rolesHired"
              maxLength={JOIN_LIMITS.rolesHired.max}
              value={values.rolesHired}
              onChange={(e) => update("rolesHired", e.target.value)}
              placeholder="e.g. Cashier, kitchen hand"
            />
          </Field>
          <Field id="websiteOrSocial" label="Website or Instagram (optional)" error={errors.websiteOrSocial}>
            <Input
              id="websiteOrSocial"
              maxLength={JOIN_LIMITS.websiteOrSocial.max}
              value={values.websiteOrSocial}
              onChange={(e) => update("websiteOrSocial", e.target.value)}
              placeholder="https://… or @yourbusiness"
            />
          </Field>

          {/* Honeypot: hidden from people and assistive tech. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="company_website">Leave this field empty</label>
            <input
              id="company_website"
              name="company_website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={values.honeypot}
              onChange={(e) => update("honeypot", e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="acceptFee"
                checked={values.acceptFee}
                onCheckedChange={(c) => update("acceptFee", c === true)}
                className="mt-0.5"
              />
              <Label htmlFor="acceptFee" className="text-sm font-normal leading-snug">
                {FEE_TEXT}
              </Label>
            </div>
            {errors.acceptFee && (
              <p className="text-sm text-destructive" role="alert">
                {errors.acceptFee}
              </p>
            )}
            <div className="flex items-start gap-3">
              <Checkbox
                id="acceptTerms"
                checked={values.acceptTerms}
                onCheckedChange={(c) => update("acceptTerms", c === true)}
                className="mt-0.5"
              />
              <Label htmlFor="acceptTerms" className="text-sm font-normal leading-snug">
                I agree to the terms and privacy policy.
              </Label>
            </div>
            {errors.acceptTerms && (
              <p className="text-sm text-destructive" role="alert">
                {errors.acceptTerms}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            {submitting ? "Sending..." : "Join Lungisa"}
          </Button>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="underline" to="/sign-in">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
