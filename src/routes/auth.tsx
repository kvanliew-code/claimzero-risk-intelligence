import { createFileRoute, useNavigate, ClientOnly } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportMotif } from "@/components/cz/report-motif";



export const Route = createFileRoute("/auth")({
  ssr: false,
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const finish = () => navigate({ to: "/", replace: true });

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
    const { error: err } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue,
    });
    setBusy(false);
    if (err) setError(err.message);
    else void finish();
  };



  return (
    <ClientOnly fallback={<div className="min-h-screen" />}>
      {() => (
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

          <form
            id="claimzero-signin"
            name="claimzero-signin"
            onSubmit={signIn}
            method="post"
            action="#"
            className="mt-8"
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
              defaultValue={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-[6px] border border-cz-rule bg-cz-surface px-3 py-2.5 font-cz-mono text-[13px] outline-none focus:border-cz-accent"
              placeholder="name@company.com"
            />
            <label className="cz-eyebrow mt-4 block text-[10px]" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              defaultValue={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-[6px] border border-cz-rule bg-cz-surface px-3 py-2.5 font-cz-mono text-[13px] outline-none focus:border-cz-accent"
              placeholder="••••••••••"
            />


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
            <button
              type="submit"
              disabled={busy}
              className="mt-5 w-full rounded-[6px] px-3 py-2.5 font-cz-sans text-[13px] font-bold disabled:opacity-60"
              style={{ background: "var(--cz-accent-solid)", color: "#fff" }}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>




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
  );
}
