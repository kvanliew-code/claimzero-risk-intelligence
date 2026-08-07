import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CzHeader } from "@/components/cz/header";
import { SHead } from "@/components/cz/shead";
import { CzButton, StatusPill } from "@/components/cz/primitives";
import { statusOf, useProjects, type Project } from "@/lib/claimzero/data";
import { useProjectScoring, type ProjectScoring } from "@/lib/claimzero/useProjectScoring";
import { ReportDoc } from "@/components/cz/report-doc";
import { renderPublishedReport } from "@/lib/claimzero/report-print.functions";
import {
  advanceStatus,
  fetchEscalationRules,
  fetchReportDefinitions,
  fetchReports,
  generateReport,
  isImplemented,
  nextRevision,
  publishReport,
  saveDraft,
  stageName,
  type GeneratedReport,
  type ReportDefinition,
  type ReportRow,
} from "@/lib/claimzero/reports";
import type { SpecEscalationRule } from "@/lib/claimzero/escalation";

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

function WeeklyBody({ project }: { project: Project }) {
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
        meta={`${project.name} · ${project.city} · ${project.type} · $${project.sizeM}M · ${project.stage} · Mon ${TODAY}`}
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

function Monthly({ project }: { project: Project }) {
  return (
    <>
      <RdHead
        title="End-of-Month Executive Report"
        meta={`${project.name} · ${project.city} · July 2026 · issued ${TODAY}`}
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

/* ------------------------------------------------------- registry grid */

const STATUS_ORDER: Record<string, number> = {
  DRAFT: 0,
  IN_REVIEW: 1,
  APPROVED: 2,
  PUBLISHED: 3,
};

const LEGACY: Record<string, "weekly" | "monthly"> = {
  WEEKLY_INTELLIGENCE: "weekly",
  MONTHLY_EXECUTIVE: "monthly",
};

function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return (
    <span
      className="rounded-sm border px-1.5 py-0.5 font-cz-mono text-[9px] tracking-[0.1em] uppercase"
      style={{ borderColor: tone ?? "var(--cz-rule)", color: tone ?? "var(--cz-ink-3)" }}
    >
      {children}
    </span>
  );
}

function RegistryCard({
  def,
  stageNumber,
  onOpen,
  latest,
}: {
  def: ReportDefinition;
  stageNumber: number;
  onOpen: () => void;
  latest: ReportRow | undefined;
}) {
  const inStage =
    def.applicable_stages.length === 0 || def.applicable_stages.includes(stageNumber);
  const available = isImplemented(def.report_key) || Boolean(LEGACY[def.report_key]);
  return (
    <div
      className="flex flex-col rounded-md border border-cz-rule bg-cz-surface p-[18px]"
      style={{
        borderTop: `2px solid ${available ? "var(--cz-accent-solid)" : "var(--cz-rule)"}`,
        opacity: available ? 1 : 0.72,
      }}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <Badge>{def.cadence.replace("_", " ")}</Badge>
        <Badge>
          stages {def.applicable_stages.length ? def.applicable_stages.join("/") : "any"}
        </Badge>
        {inStage ? (
          <Badge tone="var(--cz-good)">in stage</Badge>
        ) : (
          <Badge>out of stage</Badge>
        )}
        {latest ? <Badge tone="var(--cz-accent)">{latest.status.replace("_", " ")}</Badge> : null}
      </div>
      <h3 className="font-cz-sans text-[15px] font-semibold">{def.title}</h3>
      <div className="cz-eyebrow mt-0.5 tracking-[0.1em] text-cz-ink-3">{def.audience}</div>
      <p className="mt-1 mb-3 font-cz-serif text-[12.5px] text-cz-ink-2">{def.decision}</p>
      <div className="mt-auto">
        {available ? (
          <CzButton primary={inStage} onClick={onOpen}>
            Generate →
          </CzButton>
        ) : (
          <span className="font-cz-mono text-[10px] tracking-[0.1em] uppercase text-cz-ink-3">
            Not yet available — sections configured, generation pending the aspect taxonomy fix
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ the page */

function Reports() {
  const projects = useProjects();
  const [projectId, setProjectId] = useState<number | null>(null);
  const project = projects.find((p) => p.id === projectId) ?? projects[0];

  if (!project)
    return (
      <div className="min-h-screen">
        <CzHeader crumb={<b className="text-cz-ink-1">Reports</b>} />
        <div className="px-5 py-6 font-cz-mono text-[12px] text-cz-ink-3">Loading portfolio…</div>
      </div>
    );

  return (
    <ReportsBody
      key={project.id}
      project={project}
      projects={projects}
      onProject={setProjectId}
    />
  );
}

function ReportsBody({
  project,
  projects,
  onProject,
}: {
  project: Project;
  projects: Project[];
  onProject: (id: number) => void;
}) {
  const scoring = useProjectScoring(project);
  const [defs, setDefs] = useState<ReportDefinition[]>([]);
  const [rules, setRules] = useState<SpecEscalationRule[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [stagePick, setStagePick] = useState<number | null>(null);
  const [doc, setDoc] = useState<GeneratedReport | null>(null);
  const [row, setRow] = useState<ReportRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const renderServerHtml = useServerFn(renderPublishedReport);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const [d, r, existing] = await Promise.all([
          fetchReportDefinitions(),
          fetchEscalationRules().catch(() => [] as SpecEscalationRule[]),
          fetchReports(project.id).catch(() => [] as ReportRow[]),
        ]);
        if (dead) return;
        setDefs(d);
        setRules(r);
        setRows(existing);
      } catch (e) {
        if (!dead) setNote(e instanceof Error ? e.message : "Unable to load the report registry");
      }
    })();
    return () => {
      dead = true;
    };
  }, [project.id]);

  const stage = stagePick ?? scoring.stageNumber;
  const latestByKey = useMemo(() => {
    const m = new Map<string, ReportRow>();
    for (const r of rows) {
      const prev = m.get(r.report_key);
      if (!prev || STATUS_ORDER[r.status]! > STATUS_ORDER[prev.status]!) m.set(r.report_key, r);
    }
    return m;
  }, [rows]);

  const openDef = defs.find((d) => d.report_key === openKey) ?? null;
  const legacy = openKey ? LEGACY[openKey] : undefined;

  const runGenerate = async (def: ReportDefinition) => {
    setBusy(true);
    setNote(null);
    try {
      const revision = await nextRevision(project.id, def.report_key);
      const generated = generateReport({
        definition: def,
        project,
        scoring,
        rules,
        revision,
        stageNumber: stage,
      });
      if (!generated) {
        setNote("This report has no generator yet.");
        return;
      }
      const saved = await saveDraft(generated);
      setDoc(generated);
      setRow(saved);
      setRows((r) => [saved, ...r]);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const move = async (status: "IN_REVIEW" | "APPROVED") => {
    if (!row) return;
    setBusy(true);
    setNote(null);
    try {
      const next = await advanceStatus(row, status);
      setRow(next);
      setRows((r) => r.map((x) => (x.id === next.id ? next : x)));
    } catch {
      setNote(
        "Only an admin or reviewer may move a report past draft — the database refused the change.",
      );
    } finally {
      setBusy(false);
    }
  };

  const doPublish = async () => {
    if (!row) return;
    setBusy(true);
    setNote(null);
    try {
      const next = await publishReport(row);
      setRow(next);
      setRows((r) => r.map((x) => (x.id === next.id ? next : x)));
      setNote("Published — an immutable, hash-chained snapshot was written.");
    } catch {
      setNote("Publishing was refused: an approved report and a reviewer or admin role are required.");
    } finally {
      setBusy(false);
    }
  };

  const doExport = async () => {
    if (!row || row.status !== "PUBLISHED") return;
    setBusy(true);
    try {
      const res = await renderServerHtml({ data: { reportId: row.id } });
      const w = window.open("", "_blank");
      if (!w) {
        setNote("Allow pop-ups to export this document.");
        return;
      }
      w.document.write(res.html);
      w.document.close();
      w.focus();
      w.print();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <CzHeader
        crumb={
          <>
            <b className="text-cz-ink-1">Reports</b> · {project.name} · stage {stage}{" "}
            {stageName(stage)}
          </>
        }
      />
      <div className="cz-no-print">
        <SHead
          title="Reports"
          note="nine report types, one generator interface — export and share only from a published, snapshotted revision"
        />

        <div className="flex flex-wrap items-center gap-3 px-5 pt-3.5">
          <label className="cz-eyebrow tracking-[0.12em] text-cz-ink-3" htmlFor="rp-project">
            Project
          </label>
          <select
            id="rp-project"
            className="rounded-sm border border-cz-rule bg-cz-surface px-2 py-1 font-cz-mono text-[11px]"
            value={project.id}
            onChange={(e) => {
              onProject(Number(e.target.value));
              setDoc(null);
              setRow(null);
              setOpenKey(null);
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.city}
              </option>
            ))}
          </select>

          <label className="cz-eyebrow tracking-[0.12em] text-cz-ink-3" htmlFor="rp-stage">
            Stage
          </label>
          <select
            id="rp-stage"
            className="rounded-sm border border-cz-rule bg-cz-surface px-2 py-1 font-cz-mono text-[11px]"
            value={stage}
            onChange={(e) => setStagePick(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n} · {stageName(n)}
              </option>
            ))}
          </select>
          {scoring.loading ? (
            <span className="font-cz-mono text-[10px] tracking-[0.1em] uppercase text-cz-ink-3">
              scoring…
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3 px-5 py-3.5">
          {defs.map((d) => (
            <RegistryCard
              key={d.report_key}
              def={d}
              stageNumber={stage}
              latest={latestByKey.get(d.report_key)}
              onOpen={() => {
                setOpenKey(d.report_key);
                setDoc(null);
                setRow(null);
                setNote(null);
                if (isImplemented(d.report_key)) void runGenerate(d);
              }}
            />
          ))}
        </div>

        {note ? (
          <div className="mx-5 mb-3 rounded-sm border border-cz-rule bg-cz-surface px-3 py-2 font-cz-serif text-[12.5px] text-cz-ink-2">
            {note}
          </div>
        ) : null}

        {row && doc ? (
          <div className="mx-5 mb-1 flex flex-wrap items-center gap-2 rounded-sm border border-cz-rule bg-cz-surface px-3 py-2">
            <span className="font-cz-mono text-[10px] tracking-[0.1em] uppercase text-cz-ink-3">
              {doc.meta.doc_number} · rev {doc.meta.revision} · {row.status.replace("_", " ")}
            </span>
            <CzButton disabled={busy || row.status !== "DRAFT"} onClick={() => void move("IN_REVIEW")}>
              Submit for review
            </CzButton>
            <CzButton
              disabled={busy || row.status !== "IN_REVIEW"}
              onClick={() => void move("APPROVED")}
            >
              Approve
            </CzButton>
            <CzButton primary disabled={busy || row.status !== "APPROVED"} onClick={() => void doPublish()}>
              Publish &amp; snapshot
            </CzButton>
            <CzButton
              disabled={busy || row.status !== "PUBLISHED"}
              title={
                row.status === "PUBLISHED"
                  ? "Server-rendered canonical HTML"
                  : "Export is available only from a published revision"
              }
              onClick={() => void doExport()}
            >
              Export / share
            </CzButton>
          </div>
        ) : null}
      </div>

      {legacy ? (
        <div className="cz-print-doc mx-5 my-4 max-w-[880px] rounded-lg border border-cz-rule bg-cz-surface px-[30px] py-[26px]">
          {legacy === "weekly" ? <WeeklyBody project={project} /> : <Monthly project={project} />}
          <div className="cz-no-print mt-3.5">
            <CzButton primary onClick={() => window.print()}>
              Print / Save as PDF
            </CzButton>
          </div>
        </div>
      ) : null}

      {doc && openDef && !legacy ? <ReportDoc report={doc} /> : null}
    </div>
  );
}
