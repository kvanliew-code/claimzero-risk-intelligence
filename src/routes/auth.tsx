import { createFileRoute, useNavigate, ClientOnly } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportMotif } from "@/components/cz/report-motif";
import { Button } from "@/components/ui/button";



export const Route = createFileRoute("/auth")({
  
  head: () => ({
    meta: [
      { title: "Sign in — ClaimZero Development Risk Intelligence" },
      {
        name: "description",
        content:
          "Secure sign-in to the ClaimZero command center — development risk intelligence for owners, lenders and their project teams.",
      },
      { property: "og:title", content: "Sign in — ClaimZero" },
      {
        property: "og:description",
        content: "Secure sign-in to the ClaimZero development risk command center.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});




/** Faint drafting grid — the only thing left of the old line-art panel. */
function Grid() {
  return (
    <svg aria-hidden="true" className="h-full w-full" style={{ color: "var(--cz-accent)" }}>
      <defs>
        <pattern id="cz-blueprint" width="26" height="26" patternUnits="userSpaceOnUse">
          <path
            d="M26 0H0v26"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeWidth="0.6"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cz-blueprint)" />
    </svg>
  );
}


function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Read straight from the DOM: password managers set input.value without
    // firing React's synthetic change event, so React state can be stale/empty.
    const fd = new FormData(e.currentTarget);
    const emailValue = String(fd.get("email") ?? "").trim();
    const passwordValue = String(fd.get("password") ?? "");
    if (!emailValue || !passwordValue) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue,
    });
    if (err || !data.session) {
      setBusy(false);
      setError(err?.message ?? "Sign-in did not create a session. Please try again.");
      return;
    }

    const { data: verified, error: verificationError } = await supabase.auth.getUser();
    if (verificationError || !verified.user) {
      setBusy(false);
      setError("Your sign-in could not be verified. Please try again.");
      return;
    }

    window.location.assign("/");
  };

  const sendReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const emailValue = String(form.get("email") ?? "").trim();
    if (!emailValue) {
      setError("Enter your work email.");
      return;
    }

    setBusy(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailValue, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (resetError) setError(resetError.message);
    else setResetSent(true);
  };



  return (
    <ClientOnly fallback={<div className="min-h-screen" />}>
      <div className="grid min-h-screen grid-cols-1 sm:grid-cols-[1.05fr_1fr]">
      {/* Left: the deliverable itself, lit — a Risk Mitigation Plan page with the
          Monday digest behind it, rather than generic construction imagery. */}
      <div
        className="relative hidden overflow-hidden sm:block"
        style={{
          background:
            "radial-gradient(120% 90% at 30% 18%, color-mix(in srgb, var(--cz-accent) 22%, transparent) 0%, transparent 62%), radial-gradient(90% 70% at 88% 92%, color-mix(in srgb, #4d7fa8 22%, transparent) 0%, transparent 60%), linear-gradient(168deg, #1c2836 0%, #16202c 52%, #101a25 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-70">
          <Grid />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pr-14 pb-12">
          <ReportMotif />
        </div>
        <div className="absolute right-8 bottom-8 left-8">
          <div className="cz-eyebrow text-[10px] tracking-[0.22em]" style={{ color: "var(--cz-accent)" }}>
            —— What lands on Monday
          </div>
          <p className="mt-2 max-w-[440px] font-cz-serif text-[14px] text-cz-ink-2">
            Every flagged risk cites a source record and passes a reviewer approval gate before it
            reaches an Owner. You see problems before they become claims — source-cited, reviewer-approved, and never estimated.
          </p>
        </div>
      </div>

      <div
        className="relative flex items-center justify-center px-6 py-12"
        style={{
          background:
            "radial-gradient(100% 70% at 50% 0%, color-mix(in srgb, var(--cz-accent) 7%, transparent) 0%, transparent 58%), var(--cz-page)",
        }}
      >
        {/* Narrow screens: a faint grid sits behind the form instead of the sheets. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.5] sm:hidden">
          <Grid />
        </div>



        <div className="relative w-full max-w-[380px]">
          <div className="leading-none">
            <div className="font-cz-sans text-[30px] font-extrabold tracking-[0.4px]">
              Claim<span style={{ color: "var(--cz-accent)" }}>Zero</span>
            </div>
            <div className="cz-eyebrow mt-1.5 text-[10px] tracking-[0.22em]">
              Development Risk Intelligence
            </div>
          </div>

          <h1 className="mt-8 font-cz-serif text-[22px] text-cz-ink-1">
            {mode === "signin" ? "Sign in" : "Reset your password"}
          </h1>
          {mode === "forgot" ? (
            <p className="mt-2 font-cz-serif text-[13px] text-cz-ink-3">
              Enter your account email and we’ll send you a secure reset link.
            </p>
          ) : null}

          {mode === "forgot" && resetSent ? (
            <div className="mt-6 border-l-2 border-cz-accent pl-4">
              <p className="font-cz-serif text-sm text-cz-ink-2">
                Check your inbox for a password reset link. It may take a minute to arrive.
              </p>
              <Button
                type="button"
                variant="link"
                className="mt-3 h-auto p-0 font-cz-mono text-xs text-cz-accent"
                onClick={() => {
                  setMode("signin");
                  setResetSent(false);
                  setError(null);
                }}
              >
                Return to sign in
              </Button>
            </div>
          ) : (
          <form
            id="claimzero-signin"
            name="claimzero-signin"
            onSubmit={mode === "signin" ? signIn : sendReset}
            method="post"
            action="/auth"
            autoComplete="on"
            className="mt-6"
          >
            <label className="cz-eyebrow block text-[10px]" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className="mt-1.5 w-full rounded-[6px] border border-cz-rule bg-cz-surface px-3 py-2.5 font-cz-mono text-[13px] outline-none focus:border-cz-accent"
              placeholder="name@company.com"
            />
            {mode === "signin" ? <><label className="cz-eyebrow mt-4 block text-[10px]" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-[6px] border border-cz-rule bg-cz-surface px-3 py-2.5 font-cz-mono text-[13px] outline-none focus:border-cz-accent"
              placeholder="••••••••••"
            />
            <div className="mt-2 text-right">
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 font-cz-mono text-[11px] text-cz-accent"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                }}
              >
                Forgot password?
              </Button>
            </div></> : null}


            {error ? (
              <div
                className="mt-3 rounded-[6px] px-2.5 py-2 font-cz-mono text-[11px]"
                style={{
                  color: "var(--cz-critical)",
                  background: "color-mix(in srgb, var(--cz-critical) 12%, transparent)",
                }}
              >
                {error}
              </div>
            ) : null}
            <Button
              type="submit"
              disabled={busy}
              className="mt-5 w-full bg-cz-accent-solid font-cz-sans text-[13px] font-bold disabled:opacity-60"
            >
              {busy ? (mode === "signin" ? "Signing in…" : "Sending…") : (mode === "signin" ? "Sign in" : "Send reset link")}
            </Button>
            {mode === "forgot" ? (
              <Button
                type="button"
                variant="link"
                className="mt-3 w-full font-cz-mono text-xs text-cz-ink-3"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
              >
                Back to sign in
              </Button>
            ) : null}
          </form>
          )}




          <p className="mt-6 font-cz-serif text-[12.5px] text-cz-ink-3">
            Access is issued by ClaimZero. There is no open signup.{" "}
            <a
              href="mailto:access@claimzero.ai?subject=ClaimZero%20access%20request"
              className="underline"
              style={{ color: "var(--cz-accent)" }}
            >
              Request access
            </a>
            .
          </p>
        </div>
      </div>
    </div>
    </ClientOnly>
  );
}
