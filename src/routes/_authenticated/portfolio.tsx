import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CzHeader } from "@/components/cz/header";
import { Sparkline, StatusPill, TrendTag, scoreColor } from "@/components/cz/primitives";
import { STAGE_OPTIONS, projects, statusOf } from "@/lib/claimzero/data";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "ClaimZero — Portfolio Command Center" },
      {
        name: "description",
        content:
          "Development risk intelligence for owners: a live risk index across the portfolio, twelve aspect panels per project, and a reviewer-gated Weekly Top 10.",
      },
      { property: "og:title", content: "ClaimZero — Portfolio Command Center" },
      {
        property: "og:description",
        content:
          "Every risk cited to a project record. Every dollar figure human-approved. Never a guess.",
      },
    ],
  }),
  component: Portfolio,
});

function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="rounded-[10px] border border-cz-rule bg-cz-surface px-3.5 py-2.5">
      <div className="cz-eyebrow">{label}</div>
      <div className="cz-figure mt-0.5 text-[24px] font-bold">{value}</div>
      <div className="mt-0.5 text-[12px] text-cz-ink-2">{sub}</div>
    </div>
  );
}

function Portfolio() {
  const navigate = useNavigate();
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("risk");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const out = projects.filter(
      (p) =>
        (!stage || p.stage === stage) &&
        (!status || statusOf(p.idx) === status) &&
        (!q || p.name.toLowerCase().includes(q.toLowerCase())),
    );
    out.sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "exposure"
          ? b.exposure - a.exposure
          : b.idx - a.idx,
    );
    return out;
  }, [stage, status, sort, q]);

  const reds = list.filter((p) => statusOf(p.idx) === "Critical").length;
  const ser = list.filter((p) => statusOf(p.idx) === "Serious").length;
  const exp = list.reduce((a, p) => a + p.exposure, 0);
  const vol = list.reduce((a, p) => a + p.sizeM, 0);

  const selectCls =
    "rounded-md border border-cz-grid bg-cz-surface px-2.5 py-1.5 font-cz-mono text-[11px] tracking-[0.04em] text-cz-ink-1";

  return (
    <div className="min-h-screen">
      <CzHeader
        crumb={
          <>
            <b className="text-cz-ink-1">Portfolio Command Center</b> · concept mockup · synthetic
            data
          </>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2.5 px-5 py-3.5">
        <Kpi
          label="Projects under watch"
          value={list.length}
          sub={`$${(vol / 1000).toFixed(1)}B total project value`}
        />
        <Kpi
          label="Open priced exposure"
          value={`$${exp.toFixed(1)}M`}
          sub="across approved risks"
        />
        <Kpi
          label="Critical projects"
          value={<span style={{ color: "var(--cz-critical)" }}>▲ {reds}</span>}
          sub={`${ser} serious · reviewer queue: 14`}
        />
        <Kpi
          label="Weekly reports due Mon"
          value={list.length}
          sub="100% citation-verified before issue"
        />
        <Kpi
          label="Data feeds"
          value={
            <>
              {list.length - 3}
              <span className="text-[14px] text-cz-ink-3"> / {list.length} live</span>
            </>
          }
          sub="3 stale — flagged on report"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 pb-2.5">
        <select
          aria-label="Filter by stage"
          className={selectCls}
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        >
          <option value="">All stages</option>
          {STAGE_OPTIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          className={selectCls}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option>Critical</option>
          <option>Serious</option>
          <option>Watch</option>
          <option>Stable</option>
        </select>
        <select
          aria-label="Sort"
          className={selectCls}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="risk">Sort: Risk Index (high→low)</option>
          <option value="exposure">Sort: $ Exposure</option>
          <option value="name">Sort: Name</option>
        </select>
        <input
          aria-label="Search project"
          className={`${selectCls} min-w-[180px]`}
          placeholder="Search project…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="ml-auto font-cz-mono text-[11px] text-cz-ink-3">
          {list.length} of {projects.length} projects
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(252px,1fr))] gap-2.5 px-5 pb-8">
        {list.map((p) => {
          const st = statusOf(p.idx);
          return (
            <button
              key={p.id}
              type="button"
              title={`Open ${p.name}`}
              onClick={() => navigate({ to: "/project/$id", params: { id: String(p.id) } })}
              className="cursor-pointer rounded-[10px] border border-cz-rule bg-cz-surface p-3 text-left transition-[border-color,transform] duration-100 hover:-translate-y-px hover:border-cz-accent"
            >
              <div className="truncate font-cz-sans text-[13.5px] font-semibold">{p.name}</div>
              <div className="mt-0.5 mb-2 font-cz-mono text-[10.5px] tracking-[0.03em] text-cz-ink-3">
                {p.city} · ${p.sizeM}M · {p.stage}
              </div>
              <div className="flex items-center gap-2.5">
                <div
                  className="cz-figure min-w-[44px] text-[26px] font-bold"
                  style={{ color: scoreColor(p.idx) }}
                >
                  {p.idx}
                </div>
                <Sparkline data={p.trend} />
                <div className="ml-auto text-right">
                  <StatusPill status={st} />
                  <div className="mt-1 font-cz-mono text-[10.5px] text-cz-ink-2">
                    <TrendTag d={p.delta} /> wk
                  </div>
                </div>
              </div>
              <div className="mt-2 min-h-[34px] border-t border-cz-grid pt-1.5 text-[12px] text-cz-ink-2">
                <span style={{ color: "var(--cz-accent)" }}>⚑</span> {p.topRisk}{" "}
                <span className="font-cz-mono text-[11px] text-cz-ink-3">
                  · ${p.exposure.toFixed(1)}M exp.
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="px-5 pt-2 pb-6 text-center text-[11.5px] text-cz-ink-3">
        Concept mockup — all data synthetic. Every flagged risk cites a source record and passes the
        reviewer approval gate before any client delivery. Insufficient data is always a permitted
        answer; nothing is estimated.
      </p>
    </div>
  );
}
