import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PENDING_CODE_KEY = "lungisa-sign-in-pending-code";
const PENDING_CODE_MAX_AGE_MS = 10 * 60 * 1000;

function readPendingEmail(): string {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(PENDING_CODE_KEY) ?? "null");
    if (
      typeof saved?.email === "string" &&
      saved.email &&
      typeof saved.at === "number" &&
      Date.now() - saved.at >= 0 &&
      Date.now() - saved.at < PENDING_CODE_MAX_AGE_MS
    ) {
      return saved.email;
    }
    window.sessionStorage.removeItem(PENDING_CODE_KEY);
  } catch {
    // Unavailable or corrupt storage just means the email form is shown.
  }
  return "";
}

function savePendingEmail(email: string) {
  try {
    window.sessionStorage.setItem(PENDING_CODE_KEY, JSON.stringify({ email, at: Date.now() }));
  } catch {
    // Persistence is best effort.
  }
}

function clearPendingEmail() {
  try {
    window.sessionStorage.removeItem(PENDING_CODE_KEY);
  } catch {
    // Persistence is best effort.
  }
}

export default function SignIn() {
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [initialPendingEmail] = useState(readPendingEmail);
  const [sentEmail, setSentEmail] = useState(initialPendingEmail);
  const [loading, setLoading] = useState(false);
  const [codeSubmitting, setCodeSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resent, setResent] = useState(false);
  const [sent, setSent] = useState(Boolean(initialPendingEmail));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown === 0) return;
    const timer = window.setTimeout(
      () => setResendCooldown((remaining) => Math.max(remaining - 1, 0)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const requestSignInLink = (address: string) =>
    supabase.auth.signInWithOtp({
      email: address,
      options: {
        emailRedirectTo: "https://lungisa.netlify.app",
        // Sign-in must never create accounts; new businesses use /join.
        shouldCreateUser: false,
      },
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCode("");
    setCodeError(false);
    setResent(false);
    setSent(false);
    const { error } = await requestSignInLink(email);
    setLoading(false);
    // Unknown emails are answered like known ones so the form can't be used
    // to discover which addresses have accounts.
    if (error && error.code !== "otp_disabled" && !/signups not allowed/i.test(error.message)) {
      setError(error.message);
    } else {
      savePendingEmail(email);
      setSentEmail(email);
      setSent(true);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeSubmitting(true);
    setCodeError(false);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: sentEmail,
        token: code,
        type: "email",
      });
      if (error) setCodeError(true);
      else clearPendingEmail();
    } catch {
      setCodeError(true);
    } finally {
      setCodeSubmitting(false);
    }
  };

  const handleUseDifferentEmail = () => {
    clearPendingEmail();
    setSent(false);
    setSentEmail("");
    setCode("");
    setCodeError(false);
    setResent(false);
    setError(null);
  };

  const handleResendCode = async () => {
    setResending(true);
    setResent(false);
    try {
      const { error } = await requestSignInLink(sentEmail);
      if (error && error.code !== "otp_disabled" && !/signups not allowed/i.test(error.message)) {
        setError("We couldn't send a new code. Please try again.");
        return;
      }
      savePendingEmail(sentEmail);
      setCode("");
      setCodeError(false);
      setResendCooldown(30);
      setResent(true);
    } catch {
      setError("We couldn't send a new code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </main>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8">
        {!sent && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <h1 className="font-serif text-3xl text-foreground">Sign in to Lungisa</h1>
            <p className="text-muted-foreground text-sm">
              Enter your email and we'll send you a 6-digit code.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary-hover hover:text-secondary"
          >
            {loading ? "Sending..." : "Send code"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-sm text-muted-foreground">
            New business?{" "}
            <Link className="underline" to="/join">
              Join Lungisa
            </Link>
          </p>
        </form>
        )}
        {sent && (
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Check your email. We've sent you a 6-digit code.
            </p>
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="sign-in-code">6-digit code</Label>
                <Input
                  id="sign-in-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]*"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\s/g, "").slice(0, 6));
                    setCodeError(false);
                  }}
                  onPaste={(event) => {
                    event.preventDefault();
                    setCode(event.clipboardData.getData("text").replace(/\s/g, "").slice(0, 6));
                    setCodeError(false);
                  }}
                />
              </div>
              <Button
                type="submit"
                disabled={code.length !== 6 || codeSubmitting}
                className="w-full bg-primary text-primary-foreground hover:bg-primary-hover hover:text-secondary"
              >
                {codeSubmitting ? "Signing in..." : "Sign in"}
              </Button>
              {codeError && (
                <p className="text-sm text-destructive" role="alert">
                  That code didn't work. Check it and try again, or request a new one.
                </p>
              )}
            </form>
            <div className="space-y-2">
              <Button
                type="button"
                variant="link"
                disabled={resending || resendCooldown > 0}
                onClick={() => void handleResendCode()}
              >
                {resending
                  ? "Sending..."
                  : resendCooldown > 0
                    ? `Send a new code (${resendCooldown}s)`
                    : "Send a new code"}
              </Button>
              {resent && (
                <p className="text-sm text-foreground">A new code is on its way.</p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="button" variant="link" onClick={handleUseDifferentEmail}>
                Use a different email
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}