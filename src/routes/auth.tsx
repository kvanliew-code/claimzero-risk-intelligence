import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CzButton } from "@/components/cz/primitives";

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
    ],
  }),
  component: AuthPage,
});

const DEMO_EMAIL = "demo@claimzero.at";
const DEMO_PASSWORD = "ClaimZero-Demo-2026!";

function Motif() {
  return (
    <svg
      viewBox="0 0 520 520"
      aria-hidden="true"
      className="h-full w-full"
      style={{ color: "var(--cz-accent)" }}
    >
      <defs>
        <pattern id="cz-blueprint" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M26 0H0v26" fill="none" stroke="currentColor" strokeOpacity="0.13" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="520" height="520" fill="url(#cz-blueprint)" />
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.85">
        {/* mast */}
        <path d="M250 470V120M274 470V120M250 470h24" />
        {[...Array(11)].map((_, i) => (
          <path key={i} d={`M250 ${140 + i * 30} L274 ${170 + i * 30} M274 ${140 + i * 30} L250 ${170 + i * 30}`} strokeOpacity="0.35" />
        ))}
        {/* jib */}
        <path d="M110 120h380M120 120l40-34M470 120l-30-26" />
        <path d="M262 96 L150 118 M262 96 L400 118" strokeOpacity="0.5" />
        <path d="M262 120V86" />
        {/* hoist */}
        <path d="M356 120v78" strokeOpacity="0.6" />
        <path d="M344 198h24v18h-24z" />
        {/* skyline */}
        <path d="M40 470h440" strokeOpacity="0.5" />
        <path d="M60 470V330h58v140M140 470V378h44v92M330 470V300h52v170M400 470V352h48v118" strokeOpacity="0.28" />
      </g>
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

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) setError(err.message);
    else void finish();
  };

  const demo = async () => {
    setBusy(true);
    setError(null);
    let { error: err } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (err) {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: "Demo Principal", title: "Demonstration account" },
        },
      });
      if (!signUpErr) {
        ({ error: err } = await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        }));
      } else {
        err = signUpErr;
      }
    }
    setBusy(false);
    if (err) setError(err.message);
    else void finish();
  };

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-cz-header md:block">
        <div className="absolute inset-0 opacity-90">
          <Motif />
        </div>
        <div className="absolute right-8 bottom-8 left-8">
          <div className="cz-eyebrow text-[10px] tracking-[0.22em]" style={{ color: "var(--cz-accent)" }}>
            —— The Weekly Top 10
          </div>
          <p className="mt-2 max-w-[420px] font-cz-serif text-[14px] text-cz-ink-2">
            Every flagged risk cites a source record and passes a reviewer approval gate before it
            reaches an owner. Nothing is estimated; missing inputs are declared, never filled in.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="leading-none">
            <div className="font-cz-sans text-[30px] font-extrabold tracking-[0.4px]">
              Claim<span style={{ color: "var(--cz-accent)" }}>Zero</span>
            </div>
            <div className="cz-eyebrow mt-1.5 text-[10px] tracking-[0.22em]">
              Development Risk Intelligence
            </div>
          </div>

          <form onSubmit={signIn} className="mt-8">
            <label className="cz-eyebrow block text-[10px]" htmlFor="cz-email">
              Work email
            </label>
            <input
              id="cz-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-[6px] border border-cz-rule bg-cz-surface px-3 py-2.5 font-cz-mono text-[13px] outline-none focus:border-cz-accent"
              placeholder="name@company.com"
            />
            <label className="cz-eyebrow mt-4 block text-[10px]" htmlFor="cz-pass">
              Password
            </label>
            <input
              id="cz-pass"
              type="password"
              required
              autoComplete="current-password"
              value={password}
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

          <div className="mt-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-cz-grid" />
            <span className="cz-eyebrow text-[9px]">or</span>
            <span className="h-px flex-1 bg-cz-grid" />
          </div>

          <CzButton className="mt-4 w-full justify-center" onClick={demo} disabled={busy}>
            ◐ Enter demo — synthetic portfolio
          </CzButton>

          <p className="mt-6 font-cz-serif text-[12.5px] text-cz-ink-3">
            Access is issued by ClaimZero. There is no open signup.{" "}
            <a
              href="mailto:access@claimzero.at?subject=ClaimZero%20access%20request"
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
