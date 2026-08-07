import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CzHeader } from "@/components/cz/header";
import { SHead } from "@/components/cz/shead";
import { CzButton, StatusPill } from "@/components/cz/primitives";
import { statusOf, useProjects } from "@/lib/claimzero/data";
import { useProjectScoring } from "@/lib/claimzero/useProjectScoring";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — ClaimZero Weekly & Monthly Intelligence" },
      {
        name: "description",
        content:
          "Printable owner reports: the Weekly Development Intelligence Report with a cited Top 10, and the End-of-Month Executive Report reconciling cost, draws, schedule and the city ledger.",
      },
      { property: "og:title", content: "Reports — ClaimZero Weekly & Monthly Intelligence" },
      {
        property: "og:description",
        content:
          "Every report cites its records and passes the reviewer gate before it leaves the building.",
      },
    ],
  }),
  component: Reports,
});

const TODAY = "August 6, 2026";
const strip = (s: string) => s.replace(/<\/?b>/g, "");

function RCard({
  title,
  body,
  action,
  onClick,
  primary,
}: {
  title: string;
  body: string;
  action: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <div
      className="rounded-md border border-cz-rule bg-cz-surface p-[18px]"
      style={{ borderTop: "2px solid var(--cz-accent-solid)" }}
    >
      <h3 className="font-cz-sans text-[15px] font-semibold">{title}</h3>
      <p className="mt-1 mb-3 font-cz-serif text-[12.5px] text-cz-ink-2">{body}</p>
      <CzButton primary={primary === true} onClick={onClick}>
        {action}
      </CzButton>
    </div>
  );
}

function RdHead({ title, meta }: { title: string; meta: string }) {
  return (
    <div
      className="mb-3.5 flex items-start justify-between gap-4 pb-3"
      style={{ borderBottom: "2px solid var(--cz-accent-solid)" }}
    >
      <div>
        <h2 className="font-cz-sans text-[17px] font-bold">{title}</h2>
        <div className="cz-eyebrow mt-1 tracking-[0.12em]">{meta}</div>
      </div>
      <div className="font-cz-sans text-[15px] font-bold whitespace-nowrap">
        Claim<span style={{ color: "var(--cz-accent)" }}>Zero</span>
      </div>
    </div>
  );
}

function H4({ children }: { children: React.ReactNode }) {
  return (
    <h4
      className="cz-eyebrow mt-4 mb-1.5 tracking-[0.16em]"
      style={{ color: "var(--cz-accent)" }}
    >
      {children}
    </h4>
  );
}

function Commentary({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-cz-serif text-[13px] leading-[1.6] text-cz-ink-2">{children}</div>
  );
}

const thCls =
  "border-b border-cz-ink-3/50 px-2 py-[7px] text-left font-cz-mono text-[9.5px] tracking-[0.12em] uppercase text-cz-ink-3";
const tdCls = "border-b border-cz-grid px-2 py-2 align-top";

function Foot({ left }: { left: string }) {
  return (
    <div className="mt-4 flex flex-wrap justify-between gap-1.5 border-t border-cz-grid pt-2.5 font-cz-mono text-[9.5px] tracking-[0.08em] text-cz-ink-3">
      <span>{left}</span>
      <span>CONFIDENTIAL — PREPARED FOR THE OWNER</span>
    </div>
  );
}

function Weekly() {
  const project = useProjects()[0];
  const scoring = useProjectScoring(project);
  const top = scoring.scores
    .filter((a) => a.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 10);
  const published = scoring.composite?.index ?? null;
  const confidence = scoring.composite?.confidence ?? 0;
  return (
    <>
      <RdHead
        title="Weekly Development Intelligence Report"
        meta={`1428 Brickell · Miami, FL · $500M · Week 32 · Mon ${TODAY} · v.W32-1`}
      />
      <H4>Project Risk Index</H4>
      <div className="flex flex-wrap items-center gap-3.5">
        <span className="cz-figure text-[30px] font-bold" style={{ color: "var(--cz-serious)" }}>
          {scoring.loading ? "…" : published === null ? "—" : published}
        </span>
        <StatusPill status={statusOf(scoring.composite?.raw ?? project.idx)} />
        <span className="font-cz-serif text-[13px] text-cz-ink-2">
          {published === null && !scoring.loading
            ? `Index withheld: composite confidence is ${confidence}%, below the 60% publication floor. The evidence base is not yet sufficient to state a number to the owner.`
            : `Composite confidence ${confidence}% · computed from ${scoring.register.length} register controls at stage ${scoring.stageNumber}.`}
        </span>
      </div>

      <H4>The Top Ten — ranked by exposure × trajectory</H4>
      <table className="my-2 w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            <th className={thCls}>#</th>
            <th className={thCls}>Risk</th>
            <th className={thCls}>Trend</th>
            <th className={thCls}>Responsible</th>
            <th className={thCls}>Exposure</th>
            <th className={thCls}>Status</th>
          </tr>
        </thead>
        <tbody>
          {top.map((a, i) => (
            <tr key={a.aspect_id}>
              <td className={`${tdCls} font-cz-mono text-cz-ink-3`}>
                {String(i + 1).padStart(2, "0")}
              </td>
              <td className={`${tdCls} font-cz-serif`}>
                {a.aspect_id} · {a.aspect_name}
                <div className="text-[11.5px] text-cz-ink-3">{a.owner_question}</div>
              </td>
              <td className={tdCls}>
                {a.adverse > 0
                  ? `▲ ${a.adverse} adverse`
                  : a.blockedOrOverdue > 0
                    ? `▲ ${a.blockedOrOverdue} blocked/overdue`
                    : "— holding"}
              </td>
              <td className={tdCls}>
                {a.verified}/{a.controls} verified
              </td>
              <td className={`${tdCls} font-cz-mono whitespace-nowrap`}>{a.band}</td>
              <td className={tdCls}>
                <StatusPill status={statusOf(a.score ?? 0)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <H4>Commentary — the top three</H4>
      <Commentary>
        The curtain wall submittal loop is now the project's governing risk: a fourth resubmittal
        cycle gates the enclosure milestone, and enclosure gates finishes. Second, the
        hoist-removal sequence carries −12 days of float directly against TCO #1 — every day is
        roughly $80,000 of carry. Third, requisition #22 billed 3.1% ahead of verified
        work-in-place on Levels 58–63; recommend the owner hold that variance out of the draw
        pending field verification. Each item above traces to cited records; act on the top three
        this week.
      </Commentary>
      <Foot left="10 VERIFIED CITATIONS · REVIEWER-APPROVED BEFORE ISSUE" />
    </>
  );
}

function Monthly() {
  return (
    <>
      <RdHead
        title="End-of-Month Executive Report"
        meta={`1428 Brickell · Miami, FL · July 2026 · issued ${TODAY} · v.M07-1`}
      />
      <H4>The month in one paragraph</H4>
      <Commentary>
        July closed with the Risk Index at 71 (Serious), up 12 points over the month, driven by the
        curtain wall submittal loop and hoist-removal float erosion. Cost position remains fundable
        but tightening: contingency at 38% with 82% complete, and the anticipated cost report
        projects +$6.2M against GMP. Requisition #22 was funded with a $2.2M scheduled-vs-billed
        divergence flagged and carried. Sales absorption sits 14 units behind pro forma pace. Two
        agency items now gate the certificate-of-occupancy path.
      </Commentary>

      <H4>Cost &amp; Draws</H4>
      <table className="my-2 w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            <th className={thCls}>Measure</th>
            <th className={thCls}>Position</th>
            <th className={thCls}>Movement</th>
          </tr>
        </thead>
        <tbody>
          {[
            [
              "Contingency",
              "38% remaining at 82% complete",
              "burn outpacing progress — projected exhaustion 2 mo before CO",
            ],
            ["Anticipated cost at completion", "+$6.2M vs GMP", "+$1.1M this month"],
            [
              "Requisition #22 (pencil walk)",
              "$318M drawn (98%)",
              "billed 3.1% ahead of verified on L58–63 — flagged",
            ],
            [
              "Interest reserve",
              "4.1 months remaining",
              "1.4 months short of forecast TCO at current pace",
            ],
          ].map((r) => (
            <tr key={r[0]}>
              <td className={tdCls}>{r[0]}</td>
              <td className={tdCls}>{r[1]}</td>
              <td className={tdCls}>{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <H4>Schedule</H4>
      <table className="my-2 w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            <th className={thCls}>Path item</th>
            <th className={thCls}>Position</th>
            <th className={thCls}>Note</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Critical-path float", "−12 days", "hoist removal → lobby finishes"],
            ["Forecast TCO #1", "+14 days", "≈ $1.9M carry + extended GCs if unmitigated"],
            ["Curtain wall", "Rev 4 in review", "install rate 4.2/day vs 6.0 plan"],
          ].map((r) => (
            <tr key={r[0]}>
              <td className={tdCls}>{r[0]}</td>
              <td className={tdCls}>{r[1]}</td>
              <td className={tdCls}>{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <H4>Risks opened &amp; retired</H4>
      <Commentary>
        Opened: notice-language detected in CM correspondence (reservation of rights — enclosure
        delay); glazing sub payment-stress signals. Retired: ECB violation dismissed Jul 22; MTA
        monitoring current; roofing dry-in tracking within 3 days of baseline.
      </Commentary>

      <H4>The city ledger — path to CO</H4>
      <Commentary>
        Violations: 6 of 7 inherited items cleared; 1 remains plus 1 new Class 2 — both CO-blocking.
        DOB objection response now overdue 21 days. Elevator agency inspection not yet booked
        against a Sep 30 need date. Energization scheduled 8 days behind TCO need date.
      </Commentary>
      <Foot left="ALL FIGURES TRACE TO CITED RECORDS · REVIEWER-APPROVED" />
    </>
  );
}

function Reports() {
  const navigate = useNavigate();
  const [doc, setDoc] = useState<"none" | "weekly" | "monthly">("none");

  return (
    <div className="min-h-screen">
      <CzHeader
        crumb={
          <>
            <b className="text-cz-ink-1">Reports</b> · concept mockup · synthetic data
          </>
        }
      />
      <div className="cz-no-print">
        <SHead
          title="Reports"
          note="every report cites its records and passes the reviewer gate before it leaves the building"
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3 px-5 py-3.5">
          <RCard
            title="Weekly Development Intelligence Report"
            body="The Monday one-pager: Top 10 risks, priced and cited, with senior commentary. Five-minute read; act the same day."
            action="Generate — 1428 Brickell, Wk 32 →"
            primary
            onClick={() => setDoc("weekly")}
          />
          <RCard
            title="End-of-Month Executive Report"
            body="The month reconciled: cost vs budget vs pro forma, schedule, draws pencil-walked, risks opened and retired, the city ledger."
            action="Generate — 1428 Brickell, July →"
            primary
            onClick={() => setDoc("monthly")}
          />
          <RCard
            title="Stakeholder Packages"
            body="Audience-scoped evidence packages — lender, insurance, permitting, ADR. Issued only from reviewed risks, so each package is assembled per project from its own Reports tab."
            action="Open a project → Reports"
            onClick={() => navigate({ to: "/portfolio" })}
          />

        </div>
      </div>

      {doc !== "none" ? (
        <div className="cz-print-doc mx-5 my-4 max-w-[880px] rounded-lg border border-cz-rule bg-cz-surface px-[30px] py-[26px]">
          {doc === "weekly" ? <Weekly /> : <Monthly />}
          <div className="cz-no-print mt-3.5">
            <CzButton primary onClick={() => window.print()}>
              Print / Save as PDF
            </CzButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
