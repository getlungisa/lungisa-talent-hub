import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthTest() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSent(false);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth-test` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-8 shadow-sm">
        {session ? (
          <div className="space-y-6">
            <h1 className="font-display text-3xl text-foreground">You're signed in</h1>
            <p className="text-muted-foreground">{session.user.email}</p>
            <Button
              onClick={handleSignOut}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Sign out
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <h1 className="font-display text-3xl text-foreground">Sign in to Lungisa</h1>
              <p className="text-muted-foreground text-sm">
                Enter your email and we'll send you a magic link to sign in.
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
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {loading ? "Sending..." : "Send magic link"}
            </Button>
            {sent && (
              <p className="text-sm text-success">
                Check your email — we've sent you a link to sign in.
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}