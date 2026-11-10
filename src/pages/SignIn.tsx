import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignIn() {
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSubmitting, setCodeSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resent, setResent] = useState(false);
  const [sent, setSent] = useState(false);
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
    } catch {
      setCodeError(true);
    } finally {
      setCodeSubmitting(false);
    }
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
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <h1 className="font-serif text-3xl text-foreground">Sign in to Lungisa</h1>
            <p className="text-muted-foreground text-sm">
              Enter your email and we'll send you a sign-in link and a 6-digit code.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
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
            {loading ? "Sending..." : "Send sign-in link"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-sm text-muted-foreground">
            New business?{" "}
            <Link className="underline" to="/join">
              Join Lungisa
            </Link>
          </p>
        </form>
        {sent && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-foreground">
              Check your email. We've sent you a link and a 6-digit code.
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
            </div>
          </div>
        )}
      </div>
    </main>
  );
}