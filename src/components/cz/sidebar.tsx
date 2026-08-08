import { Link, useMatchRoute, useParams, useRouterState } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { ROLE_LABEL, useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/lib/claimzero/data";

type Item = { to: string; icon: string; label: string; params?: Record<string, string> };
type Group = { label: string; items: Item[] };

const PORTFOLIO_GROUPS: Group[] = [
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
      { to: "/queue", icon: "✓", label: "Reviewer Queue" },
      { to: "/intake", icon: "＋", label: "New Project Intake" },
      { to: "/settings", icon: "⚙", label: "Settings" },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { to: "/pipeline", icon: "⤢", label: "Pipeline" },
      { to: "/clients", icon: "◇", label: "Clients" },
      { to: "/engagements", icon: "✎", label: "Engagements" },
    ],
  },

];

const PROJECT_ITEMS: Item[] = [
  { to: "/project/$id", icon: "◐", label: "Overview" },
  { to: "/project/$id/aspects", icon: "▦", label: "The Thirty Aspects" },
  { to: "/project/$id/controls", icon: "▣", label: "Control Register" },
  { to: "/project/$id/documents", icon: "▤", label: "Documents" },
  { to: "/project/$id/reports", icon: "✎", label: "Reports" },
  { to: "/project/$id/team", icon: "◇", label: "Team & Access" },
];

function NavLink({ item, params }: { item: Item; params?: Record<string, string> }) {
  return (
    <Link
      to={item.to}
      params={params as never}
      activeOptions={{ exact: item.to === "/" || item.to === "/project/$id" }}
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
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

export function CzSidebar() {
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();
  const { profile, role, signOut, session } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const inProject = Boolean(matchRoute({ to: "/project/$id", fuzzy: true }));
  const params = useParams({ strict: false }) as { id?: string };
  const allProjects = useProjects();
  const project =
    inProject && params.id
      ? allProjects.find((p) => p.id === Number(params.id))
      : undefined;

  // Commercial pipeline (clients, opportunities, engagements) is Admin/Executive
  // only — reviewers and project managers must not see client contact data.
  const isCommercial = role === "admin" || role === "executive";
  const visibleGroups = isCommercial
    ? PORTFOLIO_GROUPS
    : PORTFOLIO_GROUPS.filter((g) => g.label !== "Pipeline");

  if (pathname === "/auth") return null;

  return (
    <aside className="cz-no-print fixed top-0 bottom-0 left-0 z-40 flex w-[198px] flex-col overflow-y-auto border-r border-cz-grid bg-cz-header px-2.5 py-3.5">
      <div className="mb-3 px-2 leading-none">
        <div className="font-cz-sans text-[17px] font-extrabold tracking-[0.4px]">
          Claim<span style={{ color: "var(--cz-accent)" }}>Zero</span>
        </div>
        <div className="cz-eyebrow mt-1 text-[9px]">Development Risk Intelligence</div>
      </div>

      <div className="flex-1">
        {inProject && project ? (
          <>
            <Link
              to="/portfolio"
              className="mb-2 flex items-center gap-2 px-2 font-cz-mono text-[10.5px] tracking-[0.06em] text-cz-ink-3 hover:text-cz-ink-1"
            >
              ← Back to Portfolio
            </Link>
            <div className="mb-2 rounded-[6px] border border-cz-rule bg-cz-surface px-2.5 py-2">
              <div className="font-cz-sans text-[12.5px] font-bold">{project.name}</div>
              <div className="font-cz-mono text-[10px] text-cz-ink-3">
                {project.city} · {project.stage}
              </div>
            </div>
            <div className="cz-eyebrow mt-3 mb-1.5 px-2 text-[9px] tracking-[0.18em]">Project</div>
            {PROJECT_ITEMS.map((it) => (
              <NavLink key={it.to} item={it} params={{ id: String(project.id) }} />
            ))}
          </>
        ) : (
          visibleGroups.map((g) => (
            <div key={g.label}>
              <div className="cz-eyebrow mt-3.5 mb-1.5 px-2 text-[9px] tracking-[0.18em]">
                {g.label}
              </div>
              {g.items.map((it) => (
                <NavLink key={it.to} item={it} />
              ))}
            </div>
          ))
        )}
      </div>

      <div className="mt-3 border-t border-cz-grid px-2 pt-2.5">
        <div className="font-cz-sans text-[12.5px] font-bold">
          {session ? profile?.full_name || profile?.email || "Signed in" : "Not signed in"}

        </div>
        <div className="cz-eyebrow text-[9px]" style={{ color: "var(--cz-accent)" }}>
          {role ? ROLE_LABEL[role] : "No role assigned"}
        </div>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            void navigate({ to: "/auth", replace: true });
          }}
          className="mt-1.5 font-cz-mono text-[10px] tracking-[0.06em] text-cz-ink-3 uppercase hover:text-cz-ink-1"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}
