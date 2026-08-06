import { createFileRoute } from "@tanstack/react-router";
import { CzHeader } from "@/components/cz/header";
import { SHead } from "@/components/cz/shead";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Daily Digest — ClaimZero Command Center" },
      {
        name: "description",
        content:
          "The morning pass across the whole book: today's alerts, overnight status changes, stale data feeds, the reviewer queue and reports due Monday.",
      },
      { property: "og:title", content: "Daily Digest — ClaimZero Command Center" },
      {
        property: "og:description",
        content:
          "What changed overnight across every project — alerts, status moves, stale feeds and the reviewer queue.",
      },
    ],
  }),
  component: Digest,
});

function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <div
      className="rounded-[10px] border border-cz-rule bg-cz-surface px-3.5 py-2.5"
      style={{ borderTop: "2px solid var(--cz-accent-solid)" }}
    >
      <div className="cz-eyebrow" style={{ color: "var(--cz-accent)" }}>
        {label}
      </div>
      <div className="cz-figure mt-0.5 text-[24px] font-bold">{value}</div>
      <div className="mt-0.5 text-[12px] text-cz-ink-2">{sub}</div>
    </div>
  );
}

const ALERTS: { project: string; line: string; tag: string; color: string }[] = [
  {
    project: "1428 Brickell",
    line: "curtain wall Rev 4 review day 7 of 10; hoist-removal float −12d",
    tag: "▲ CRITICAL PATH",
    color: "var(--cz-critical)",
  },
  {
    project: "The Lenox",
    line: "third failed firestopping inspection, same sub",
    tag: "◆ REPEAT OFFENDER",
    color: "var(--cz-serious)",
  },
  {
    project: "Highline West",
    line: "contingency burn crossed 11 pts ahead of underwriting",
    tag: "◆ COST",
    color: "var(--cz-serious)",
  },
  {
    project: "The Ashford",
    line: "DOB objection now 22 days unanswered",
    tag: "● AGENCIES",
    color: "var(--cz-warn-ink)",
  },
  {
    project: "Summit Ridge",
    line: "interest reserve trend improved after re-forecast",
    tag: "✓ IMPROVED",
    color: "var(--cz-good)",
  },
];

function Digest() {
  return (
    <div className="min-h-screen">
      <CzHeader
        crumb={
          <>
            <b className="text-cz-ink-1">Daily Digest</b> · concept mockup · synthetic data
          </>
        }
      />
      <SHead title="Daily Digest" note="the morning pass across the whole book — what changed overnight" />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2.5 px-5 py-3.5">
        <Kpi
          label="Alerting today"
          value={<span style={{ color: "var(--cz-critical)" }}>▲ 9</span>}
          sub="4 daily-watch · 5 project flags"
        />
        <Kpi label="Status changes overnight" value="3" sub="2 worsened · 1 improved" />
        <Kpi label="Feeds stale" value="3" sub="flagged on affected reports" />
        <Kpi label="Reviewer queue" value="14" sub="6 risks · 8 exposure values" />
        <Kpi label="Reports due Monday" value="60" sub="all citation-verified" />
      </div>

      <div className="px-5 pb-8">
        {ALERTS.map((a) => (
          <div
            key={a.project}
            className="flex flex-wrap items-baseline gap-x-2 border-b border-cz-grid py-2 text-[13px]"
          >
            <b>{a.project}</b>
            <span className="text-cz-ink-2">— {a.line}</span>
            <span className="font-cz-mono text-[10px] tracking-[0.08em]" style={{ color: a.color }}>
              {a.tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
