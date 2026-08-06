import { Link } from "@tanstack/react-router";

const GROUPS: { label: string; items: { to: string; icon: string; label: string }[] }[] = [
  {
    label: "Command Center",
    items: [
      { to: "/", icon: "◐", label: "Daily Digest" },
      { to: "/portfolio", icon: "▦", label: "Portfolio" },
      { to: "/reports", icon: "▤", label: "Reports" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/intake", icon: "＋", label: "New Project / Intake" },
      { to: "/queue", icon: "✓", label: "Reviewer Queue" },
      { to: "/settings", icon: "⚙", label: "Settings" },
    ],
  },
];

export function CzSidebar() {
  return (
    <aside className="cz-no-print fixed top-0 bottom-0 left-0 z-40 w-[198px] overflow-y-auto border-r border-cz-grid bg-cz-header px-2.5 py-3.5">
      <div className="mb-3 px-2 leading-none">
        <div className="font-cz-sans text-[17px] font-extrabold tracking-[0.4px]">
          Claim<span style={{ color: "var(--cz-accent)" }}>Zero</span>
        </div>
        <div className="cz-eyebrow mt-1 text-[9px]">Development Risk Intelligence</div>
      </div>
      {GROUPS.map((g) => (
        <div key={g.label}>
          <div className="cz-eyebrow mt-3.5 mb-1.5 px-2 text-[9px] tracking-[0.18em]">
            {g.label}
          </div>
          {g.items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              activeOptions={{ exact: it.to === "/" }}
              className="mb-0.5 flex items-center gap-2.5 rounded-[5px] border-l-2 border-transparent px-2.5 py-2 text-[13px] text-cz-ink-2 transition-colors hover:bg-white/5 hover:text-cz-ink-1"
              activeProps={{
                className: "cz-nav-active text-cz-ink-1",
                style: {
                  background: "color-mix(in srgb, var(--cz-accent) 16%, transparent)",
                  borderLeftColor: "var(--cz-accent-solid)",
                },
              }}
            >
              <span
                className="w-4 text-center font-cz-mono"
                style={{ color: "var(--cz-accent)" }}
                aria-hidden="true"
              >
                {it.icon}
              </span>
              {it.label}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}
