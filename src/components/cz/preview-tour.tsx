/**
 * PreviewTour — the sign-in artwork, made walkable.
 *
 * A miniature, non-functional replica of the command-center shell: the same
 * nav vocabulary on the left, and a paper "sheet" on the right that changes to
 * whatever the visitor clicks. Every name and number here is fictitious — this
 * is a shop window, not live data.
 */

import { useState } from "react";

type Tone = "good" | "warn" | "serious" | "critical";

const TONE: Record<Tone, string> = {
  good: "var(--cz-good)",
  warn: "#9a6b00",
  serious: "#b8552a",
  critical: "var(--cz-critical)",
};

function Sheet({
  kicker,
  docref,
  title,
  sub,
  children,
  footL,
  footR,
}: {
  kicker: string;
  docref: string;
  title: string;
  sub: string;
  children: React.ReactNode;
  footL: string;
  footR: string;
}) {
  return (
    <div className="w-full rounded-[3px] bg-cz-paper shadow-[0_38px_70px_-24px_rgba(0,0,0,0.75)]">
      <div
        className="flex items-start justify-between border-b px-5 pt-4 pb-2.5"
        style={{ borderColor: "var(--cz-paper-rule)" }}
      >
        <div>
          <div
            className="font-cz-sans text-[13px] leading-none font-extrabold"
            style={{ color: "var(--cz-paper-ink)" }}
          >
            Claim<span style={{ color: "var(--cz-accent-solid)" }}>Zero</span>
          </div>
          <div
            className="mt-1.5 font-cz-mono text-[7.5px] tracking-[0.2em]"
            style={{ color: "var(--cz-paper-ink-2)" }}
          >
            {kicker}
          </div>
        </div>
        <div
          className="text-right font-cz-mono text-[7.5px] leading-[1.7] tracking-[0.12em]"
          style={{ color: "var(--cz-paper-ink-2)" }}
        >
          {docref}
        </div>
      </div>

      <div className="px-5 pt-3">
        <div className="font-cz-serif text-[14px] leading-tight" style={{ color: "var(--cz-paper-ink)" }}>
          {title}
        </div>
        <div
          className="mt-1 font-cz-mono text-[8px] tracking-[0.12em]"
          style={{ color: "var(--cz-paper-ink-2)" }}
        >
          {sub}
        </div>
      </div>

      <div className="px-5 pt-3">{children}</div>

      <div
        className="mt-3 flex items-center justify-between border-t px-5 py-2.5 font-cz-mono text-[7.5px] tracking-[0.14em]"
        style={{ borderColor: "var(--cz-paper-rule)", color: "var(--cz-paper-ink-2)" }}
      >
        <span>{footL}</span>
        <span>{footR}</span>
      </div>
    </div>
  );
}

function Rows({
  rows,
}: {
  rows: { a: string; b: string; chip?: string; tone?: Tone }[];
}) {
  return (
    <div>
      {rows.map((r) => (
        <div
          key={r.a + r.b}
          className="flex items-start justify-between gap-3 border-b py-1.5"
          style={{ borderColor: "var(--cz-paper-rule)" }}
        >
          <div className="min-w-0">
            <div
              className="font-cz-mono text-[8px] tracking-[0.1em]"
              style={{ color: "var(--cz-paper-ink-2)" }}
            >
              {r.a}
            </div>
            <div
              className="mt-0.5 truncate font-cz-serif text-[10.5px]"
              style={{ color: "var(--cz-paper-ink)" }}
            >
              {r.b}
            </div>
          </div>
          {r.chip ? (
            <span
              className="mt-0.5 shrink-0 rounded-[2px] px-1.5 py-[3px] font-cz-mono text-[7px] font-bold tracking-[0.12em]"
              style={{
                color: TONE[r.tone ?? "warn"],
                background: `color-mix(in srgb, ${TONE[r.tone ?? "warn"]} 14%, transparent)`,
              }}
            >
              {r.chip}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Bars() {
  const bars = [38, 52, 47, 61, 55, 72, 66, 81, 74, 88, 79, 93];
  return (
    <div className="flex h-[46px] items-end gap-[5px]">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-[1px]"
          style={{
            height: `${h}%`,
            background:
              i >= bars.length - 3
                ? "var(--cz-accent-solid)"
                : "color-mix(in srgb, var(--cz-paper-ink) 26%, transparent)",
          }}
        />
      ))}
    </div>
  );
}

const SCREENS: Record<string, React.ReactNode> = {
  digest: (
    <Sheet
      kicker="DAILY DIGEST"
      docref={"CZ-DIG-0207\n07 AUG 2026"}
      title="What changed overnight"
      sub="6 ALERTS · 63 PROJECTS · SOURCE-CITED"
      footL="EVERY LINE CITES A RECORD"
      footR="REVIEWER APPROVED"
    >
      <Rows
        rows={[
          {
            a: "HARBOR POINT · S4-PRC-022",
            b: "Switchgear release passed 11 days ago",
            chip: "CRITICAL PATH",
            tone: "critical",
          },
          {
            a: "THE LENOX · S4-QUA-009",
            b: "Third failed firestopping inspection",
            chip: "REPEAT",
            tone: "serious",
          },
          {
            a: "HIGHLINE WEST · S4-CST-031",
            b: "Contingency burn 11 pts ahead of plan",
            chip: "COST",
            tone: "serious",
          },
          {
            a: "SUMMIT RIDGE · S5-FIN-004",
            b: "Interest reserve trend improved",
            chip: "IMPROVED",
            tone: "good",
          },
        ]}
      />
    </Sheet>
  ),
  portfolio: (
    <Sheet
      kicker="PORTFOLIO"
      docref={"CZ-PTF-0207\nALL STAGES"}
      title="Risk index across the book"
      sub="12-WEEK EXPOSURE TREND"
      footL="4 CRITICAL · 9 SERIOUS"
      footR="2 INDICES WITHHELD"
    >
      <Bars />
      <div className="mt-2">
        <Rows
          rows={[
            { a: "STAGE 4 · CONSTRUCTION", b: "Harbor Point Residences", chip: "68", tone: "serious" },
            { a: "STAGE 5 · CLOSE-OUT", b: "The Lenox", chip: "81", tone: "good" },
            { a: "STAGE 3 · SCHEMATIC", b: "Highline West", chip: "WITHHELD", tone: "warn" },
          ]}
        />
      </div>
    </Sheet>
  ),
  reports: (
    <Sheet
      kicker="REPORTS"
      docref={"CZ-RPT-INDEX\nR4"}
      title="What lands on Monday"
      sub="FOUR ACTIVE GENERATORS · PRINT-READY"
      footL="NO FINDING WITHOUT A REMEDY"
      footR="HUMAN-REVIEWED"
    >
      <Rows
        rows={[
          { a: "REPORT 04", b: "Risk Mitigation Plan", chip: "ACTIVE", tone: "good" },
          { a: "REPORT 07", b: "Stage Gate Assessment", chip: "ACTIVE", tone: "good" },
          { a: "REPORT 10", b: "Development Control Report Card", chip: "ACTIVE", tone: "good" },
          { a: "REPORT 11", b: "Time & Money", chip: "ACTIVE", tone: "good" },
        ]}
      />
    </Sheet>
  ),
  queue: (
    <Sheet
      kicker="REVIEWER QUEUE"
      docref={"CZ-RVW-0207\nOPEN"}
      title="Nothing reaches an Owner unreviewed"
      sub="34 ITEMS PENDING · 3 REVIEWERS"
      footL="MEDIAN TURNAROUND 6H"
      footR="0 AUTO-PUBLISHED"
    >
      <Rows
        rows={[
          { a: "RISK · HARBOR POINT", b: "Procurement slip — exposure declared", chip: "PENDING", tone: "warn" },
          { a: "EXPOSURE · THE LENOX", b: "$412K rework estimate awaiting sign-off", chip: "PENDING", tone: "warn" },
          { a: "RISK · ASHFORD", b: "DOB objection 22 days unanswered", chip: "ESCALATED", tone: "critical" },
          { a: "RISK · SUMMIT RIDGE", b: "Re-forecast accepted", chip: "APPROVED", tone: "good" },
        ]}
      />
    </Sheet>
  ),
  pipeline: (
    <Sheet
      kicker="PIPELINE"
      docref={"CZ-PIP-0207\nQ3 FORECAST"}
      title="Engagements ahead of capacity"
      sub="ILLUSTRATIVE NAMES · CAPACITY-AWARE"
      footL="7 OPPORTUNITIES"
      footR="2 OVER REVIEWER CAPACITY"
    >
      <Rows
        rows={[
          { a: "PROPOSAL · MERIDIAN CAPITAL", b: "Two-tower residential, Stage 2", chip: "70%", tone: "good" },
          { a: "QUALIFYING · NORTHGATE UNIV.", b: "Science building fit-out", chip: "40%", tone: "warn" },
          { a: "ENGAGED · ATLAS DEVELOPMENT", b: "Mixed-use, Stage 4 mid-build", chip: "SIGNED", tone: "good" },
          { a: "AT RISK · CEDAR & VINE", b: "Start date slipped a quarter", chip: "HOLD", tone: "serious" },
        ]}
      />
    </Sheet>
  ),
};

const NAV: { key: keyof typeof SCREENS; icon: string; label: string; group: string }[] = [
  { key: "digest", icon: "◐", label: "Daily Digest", group: "Command Center" },
  { key: "portfolio", icon: "▦", label: "Portfolio", group: "Command Center" },
  { key: "reports", icon: "▤", label: "Reports", group: "Command Center" },
  { key: "queue", icon: "✓", label: "Reviewer Queue", group: "Operations" },
  { key: "pipeline", icon: "⤢", label: "Pipeline", group: "Pipeline" },
];

export function PreviewTour({ className = "" }: { className?: string }) {
  const [active, setActive] = useState<string>("digest");

  return (
    <div className={`flex w-full max-w-[520px] items-start gap-4 select-none ${className}`}>
      <nav
        aria-label="Product preview"
        className="w-[150px] shrink-0 rounded-[8px] border border-cz-grid bg-cz-header px-2 py-2.5"
      >
        {NAV.map((item, i) => (
          <div key={item.key}>
            {i === 0 || NAV[i - 1]!.group !== item.group ? (
              <div className="cz-eyebrow mt-2 mb-1 px-1.5 text-[8px] tracking-[0.18em] first:mt-0">
                {item.group}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setActive(item.key)}
              aria-pressed={active === item.key}
              className="mb-0.5 flex w-full items-center gap-2 rounded-[5px] border-l-2 border-transparent px-2 py-1.5 text-left text-[11.5px] text-cz-ink-2 transition-colors hover:bg-white/5 hover:text-cz-ink-1"
              style={
                active === item.key
                  ? {
                      background: "color-mix(in srgb, var(--cz-accent) 16%, transparent)",
                      borderLeftColor: "var(--cz-accent-solid)",
                      color: "var(--cz-ink-1)",
                    }
                  : undefined
              }
            >
              <span
                className="w-3 text-center font-cz-mono"
                style={{ color: "var(--cz-accent)" }}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          </div>
        ))}
        <div className="mt-2 border-t border-cz-grid px-1.5 pt-2 font-cz-mono text-[8px] leading-[1.6] tracking-[0.1em] text-cz-ink-3">
          PREVIEW ONLY
          <br />
          ILLUSTRATIVE DATA
        </div>
      </nav>

      <div key={active} className="cz-preview-sheet min-w-0 flex-1 rotate-[-1deg]">
        {SCREENS[active]}
      </div>
    </div>
  );
}
