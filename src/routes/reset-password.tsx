import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — ClaimZero" },
      {
        name: "description",
        content: "Choose a new password for your ClaimZero account.",
      },
      { property: "og:title", content: "Reset password — ClaimZero" },
      {
        property: "og:description",
        content: "Securely choose a new password for your ClaimZero account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !cancelled) {
        setReady(true);
        setError(null);
      }
    });

    const linkError = hash.get("error_description") ?? query.get("error_description");

    const run = async () => {
      if (linkError) {
        setError(decodeURIComponent(linkError.replace(/\+/g, " ")));
        return;
      }

      // 1. Already have a session (supabase-js may have consumed the link already)
      const existing = await supabase.auth.getSession();
      if (existing.data.session) {
        if (!cancelled) setReady(true);
        return;
      }

      // 2. Implicit flow: tokens in the URL hash
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!cancelled) {
          if (sessionError) setError(sessionError.message);
          else setReady(true);
        }
        return;
      }

      // 3. PKCE flow: ?code=...
      const code = query.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled) {
          if (exchangeError) setError("This reset link is invalid or has expired. Request a new one.");
          else setReady(true);
        }
        return;
      }

      // 4. Legacy token_hash / OTP link
      const tokenHash = query.get("token_hash") ?? hash.get("token_hash");
      if (tokenHash) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });
        if (!cancelled) {
          if (otpError) setError(otpError.message);
          else setReady(true);
        }
        return;
      }

      if (!cancelled) {
        setError("This reset link is invalid or has expired. Request a new one.");
      }
    };

    void run();

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);


  const updatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("new-password") ?? "");
    const confirmation = String(form.get("confirm-password") ?? "");

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) setError(updateError.message);
    else setComplete(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cz-page px-6 py-12">
      <section className="w-full max-w-[380px]">
        <div className="font-cz-sans text-[30px] font-extrabold tracking-[0.4px]">
          Claim<span className="text-cz-accent">Zero</span>
        </div>
        <div className="cz-eyebrow mt-1.5 text-[10px] tracking-[0.22em]">
          Development Risk Intelligence
        </div>

        <h1 className="mt-10 font-cz-serif text-2xl text-cz-ink-1">
          {complete ? "Password updated" : "Choose a new password"}
        </h1>

        {complete ? (
          <div className="mt-5">
            <p className="font-cz-serif text-sm text-cz-ink-2">
              Your password has been changed. You can now sign in with the new password.
            </p>
            <Button asChild className="mt-6 w-full bg-cz-accent-solid font-cz-sans font-bold">
              <Link to="/auth">Return to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={updatePassword} className="mt-6">
            <label className="cz-eyebrow block text-[10px]" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              disabled={!ready || busy}
              className="mt-1.5 w-full rounded-[6px] border border-cz-rule bg-cz-surface px-3 py-2.5 font-cz-mono text-[13px] outline-none focus:border-cz-accent disabled:opacity-60"
            />
            <label className="cz-eyebrow mt-4 block text-[10px]" htmlFor="confirm-password">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              disabled={!ready || busy}
              className="mt-1.5 w-full rounded-[6px] border border-cz-rule bg-cz-surface px-3 py-2.5 font-cz-mono text-[13px] outline-none focus:border-cz-accent disabled:opacity-60"
            />

            {error ? (
              <div className="mt-3 rounded-[6px] bg-cz-critical/10 px-2.5 py-2 font-cz-mono text-[11px] text-cz-critical">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={!ready || busy}
              className="mt-5 w-full bg-cz-accent-solid font-cz-sans font-bold"
            >
              {busy ? "Updating…" : ready ? "Update password" : "Validating link…"}
            </Button>
            <Link to="/auth" className="mt-4 block text-center font-cz-mono text-xs text-cz-ink-3 underline">
              Back to sign in
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}