// The report module. Nine report types live as rows in public.report_definitions;
// this file is the single generator interface they all run through. A report is
// configuration (sections) plus one pure generator that turns live register,
// scoring and escalation data into typed section primitives. Nothing is bespoke
// per report beyond its section configuration.

import { supabase } from "@/integrations/supabase/client";
import type { Project } from "./data";
import type { ControlInstance, ControlSpec } from "./controls";
import { STATUS_LABEL } from "./controls";
import { fetchSpecRules, severityOf, type SpecEscalationRule } from "./escalation";
import {
  deriveFinance,
  hasFinance,
  pct,
  usd,
  type FinanceDerived,
  type ProjectFinance,
} from "./finance";
import type { ProjectScoring } from "./useProjectScoring";


/* ------------------------------------------------------------------ types */

export const SECTION_TYPES = [
  "aspect_summary",
  "control_table",
  "exit_criteria_status",
  "finding_list",
  "chronology",
  "narrative",
  "signature_block",
  "metric_grid",
  "grade_card",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export interface SectionConfig {
  type: SectionType;
  title: string;
  config: Record<string, unknown>;
}

export interface ReportDefinition {
  report_key: string;
  title: string;
  audience: string;
  decision: string;
  applicable_stages: number[];
  cadence: string;
  sections: SectionConfig[];
  active: boolean;
  sort_order: number;
}

export interface Citation {
  ref: string;
  control_id?: string;
  document?: string;
  page?: string;
  clause?: string;
}

export interface Column {
  key: string;
  label: string;
}

export type ReportSection =
  | { type: "narrative"; title: string; body: string[] }
  | {
      type: "aspect_summary";
      title: string;
      index: number | null;
      confidence: number;
      band: string;
      withheldReason: string | null;
      rows: {
        aspect_id: string;
        aspect_name: string;
        score: number | null;
        band: string;
        verified: number;
        controls: number;
        weighted: boolean;
      }[];
    }
  | {
      type: "control_table";
      title: string;
      columns: Column[];
      groups: { label: string; rows: Record<string, string>[] }[];
    }
  | {
      type: "exit_criteria_status";
      title: string;
      hard: {
        criterion_id: string;
        exit_criterion: string;
        evidence_required: string;
        satisfied: boolean;
        open: string[];
      }[];
      soft: {
        criterion_id: string;
        exit_criterion: string;
        evidence_required: string;
        satisfied: boolean;
        open: string[];
      }[];
    }
  | {
      type: "finding_list";
      title: string;
      items: { headline: string; detail: string; severity: string; consequence: string }[];
    }
  | {
      type: "chronology";
      title: string;
      entries: { date: string; event: string; owner: string; source: string }[];
    }
  | {
      type: "signature_block";
      title: string;
      statement: string;
      signatories: string[];
    }
  | {
      type: "metric_grid";
      title: string;
      note: string | null;
      metrics: {
        label: string;
        value: string;
        sub: string;
        tone: "good" | "warn" | "bad" | "neutral";
      }[];
    }
  | {
      type: "grade_card";
      title: string;
      note: string | null;
      rows: {
        stage: number;
        phase: string;
        state: string;
        applicable: number;
        verified: number;
        completeness: number;
        grade: string;
        tone: "good" | "warn" | "bad" | "neutral";
        kpi: string;
      }[];
    };


export interface ReportMeta {
  report_key: string;
  title: string;
  audience: string;
  decision: string;
  project_id: number;
  project_name: string;
  project_location: string;
  stage_number: number;
  stage_name: string;
  doc_number: string;
  revision: number;
  issued: string;
  controlled: boolean;
}

export interface GeneratedReport {
  meta: ReportMeta;
  sections: ReportSection[];
  citations: Citation[];
  confidence: number;
  unresolvedInputs: string[];
}

export interface GeneratorContext {
  definition: ReportDefinition;
  project: Project;
  scoring: ProjectScoring;
  rules: SpecEscalationRule[];
  revision: number;
  /** Stage the user picked; defaults to the project's current stage. */
  stageNumber: number;
  /** Captured budget and schedule facts. Null when nothing has been entered. */
  finance?: ProjectFinance | null;
}


export type Generator = (ctx: GeneratorContext) => GeneratedReport;

/* -------------------------------------------------------------- registry */

export async function fetchReportDefinitions(): Promise<ReportDefinition[]> {
  const { data, error } = await supabase
    .from("report_definitions")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return {
      report_key: String(row["report_key"]),
      title: String(row["title"]),
      audience: String(row["audience"] ?? ""),
      decision: String(row["decision"] ?? ""),
      applicable_stages: (row["applicable_stages"] as number[]) ?? [],
      cadence: String(row["cadence"] ?? "ON_DEMAND"),
      sections: (row["sections"] as SectionConfig[]) ?? [],
      active: Boolean(row["active"]),
      sort_order: Number(row["sort_order"] ?? 0),
    };
  });
}

const STAGE_NAME: Record<number, string> = {
  1: "Pre-Acquisition",
  2: "Entitlement",
  3: "Design",
  4: "Preconstruction",
  5: "Construction",
  6: "Closeout",
  7: "Sellout",
};

export const stageName = (n: number) => STAGE_NAME[n] ?? `Stage ${n}`;

const today = () =>
  new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const docNumber = (key: string, projectId: number, stage: number) =>
  `CZ-${key.split("_").map((w) => w.slice(0, 3)).join("").toUpperCase()}-${String(projectId).padStart(4, "0")}-S${stage}`;

function baseMeta(ctx: GeneratorContext, controlled: boolean): ReportMeta {
  const { definition, project, stageNumber, revision } = ctx;
  return {
    report_key: definition.report_key,
    title: definition.title,
    audience: definition.audience,
    decision: definition.decision,
    project_id: project.id,
    project_name: project.name,
    project_location: `${project.city} · ${project.type} · $${project.sizeM}M`,
    stage_number: stageNumber,
    stage_name: stageName(stageNumber),
    doc_number: docNumber(definition.report_key, project.id, stageNumber),
    revision,
    issued: today(),
    controlled,
  };
}

const statusLabel = (s: string) => STATUS_LABEL[s as keyof typeof STATUS_LABEL] ?? s;

const instStatus = (scoring: ProjectScoring, id: string) =>
  scoring.instanceMap.get(id)?.status ?? "EVIDENCE_NOT_LOCATED";

function citationsFor(specs: ControlSpec[], scoring: ProjectScoring): Citation[] {
  return specs.map((c) => {
    const inst: ControlInstance | undefined = scoring.instanceMap.get(c.control_id);
    const cite: Citation = {
      ref: inst?.evidence_ref?.trim()
        ? inst.evidence_ref
        : "EVIDENCE NOT LOCATED — claim not citable",
      control_id: c.control_id,
      document: c.expected_evidence,
    };
    return cite;
  });
}

/* ---------------------------------------------- generator 4 — the RMP */

const PLATFORM_PARTICIPATION = [
  "Every party named in this plan is provisioned an account on the ClaimZero platform by the Construction Manager within five working days of receiving this document. Accounts are named individuals, not shared mailboxes; the responsible seat listed against each control must correspond to a provisioned account.",
  "Evidence is uploaded against the control it satisfies, not emailed. The upload cadence is weekly by close of business Friday for routine controls, and within 24 hours for any control whose escalation trigger has fired. A control moves to Complete — Verified only when a reviewer has applied the verification method stated in the control row; self-certification does not close a control.",
  "Documents uploaded must carry the page and clause reference relied upon. An upload without a locatable citation is recorded as Asserted — Unverified and does not count toward completeness.",
  "Failure to provision, upload on cadence, or respond to an escalation is itself recorded against the responsible seat and is reportable to the owner in the weekly intelligence report.",
];

const rmpGenerator: Generator = (ctx) => {
  const { scoring, stageNumber } = ctx;
  const meta = baseMeta(ctx, true);
  const unresolved: string[] = [];

  const specs = scoring.register.filter(
    (c) =>
      (c.continuous ? c.stage_number <= stageNumber : c.stage_number === stageNumber) &&
      instStatus(scoring, c.control_id) !== "N/A",
  );

  const byAspect = new Map<string, ControlSpec[]>();
  for (const c of specs) {
    const key = c.aspect_id ?? "UNMAPPED";
    const list = byAspect.get(key) ?? [];
    list.push(c);
    byAspect.set(key, list);
  }
  if (byAspect.has("UNMAPPED"))
    unresolved.push(
      `${byAspect.get("UNMAPPED")?.length ?? 0} required controls carry no aspect mapping and are grouped as Unmapped`,
    );

  const aspectName = new Map(scoring.aspects.map((a) => [a.aspect_id, a.aspect_name]));

  const groups = [...byAspect.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([aspectId, list]) => ({
      label: `${aspectId} · ${aspectName.get(aspectId) ?? "Unmapped aspect"}`,
      rows: list.map((c) => ({
        control_id: c.control_id,
        title: c.title || c.requirement,
        responsible_seat: c.responsible_seat || c.primary_owner_role || "— NO NAMED SEAT —",
        evidence_class: c.evidence_class || "—",
        verification_method: c.verification_method || "—",
        mitigation_template:
          (c as ControlSpec & { mitigation_template?: string | null }).mitigation_template ||
          c.objective ||
          c.requirement,
        status: statusLabel(instStatus(scoring, c.control_id)),
      })),
    }));

  const seatless = specs.filter(
    (c) => !(c.responsible_seat || c.primary_owner_role || "").trim(),
  );
  if (seatless.length)
    unresolved.push(
      `${seatless.length} controls in this issue have no named responsible seat — the plan cannot be enforced against an unnamed party`,
    );

  const stageRules = ctx.rules.filter(
    (r) => r.stages.length === 0 || r.stages.includes(stageNumber),
  );
  const findings = stageRules.map((r) => ({
    headline: `${r.rule_id ? `${r.rule_id} · ` : ""}${r.name}`,
    detail: r.conditions || r.description,
    severity: severityOf(r.severity_floor),
    consequence: r.action || "Escalates to the reviewer queue and is reported to the owner.",
  }));
  if (!findings.length) unresolved.push("No escalation rules are configured for this stage");

  const scored = scoring.scores.filter((s) => s.score !== null);
  const sections: ReportSection[] = [
    {
      type: "narrative",
      title: "Purpose and scope",
      body: [
        `This Risk Mitigation Plan is a controlled document issued at ${stageNumber >= 5 ? "Notice to Proceed" : "GMP"} to the Construction Manager, the design team and every subcontractor performing work on ${meta.project_name}. It states, per aspect, the controls each party must satisfy, the evidence that satisfies them, and the consequence of failing to.`,
        "It supersedes all prior revisions. Revisions are issued by ClaimZero only; annotated copies are not controlled. Receipt must be acknowledged on the signature block at the end of this document before the first payment application is certified.",
        `Issue basis: ${specs.length} required controls at stage ${stageNumber} (${stageName(stageNumber)}), ${scored.length} scored aspects, composite confidence ${scoring.composite?.confidence ?? 0}%.`,
      ],
    },
    {
      type: "aspect_summary",
      title: "Aspect position at issue",
      index: scoring.composite?.index ?? null,
      confidence: scoring.composite?.confidence ?? 0,
      band: scoring.composite?.band ?? "INSUFFICIENT",
      withheldReason:
        scoring.composite && scoring.composite.index === null
          ? `Composite index withheld: confidence is ${scoring.composite.confidence}%, below the 60% publication floor. The gaps below are published in its place.`
          : null,
      rows: scoring.scores.map((s) => ({
        aspect_id: s.aspect_id,
        aspect_name: s.aspect_name,
        score: s.score,
        band: s.band,
        verified: s.verified,
        controls: s.controls,
        weighted: false,
      })),
    },
    {
      type: "control_table",
      title: "Required controls by aspect",
      columns: [
        { key: "control_id", label: "Control" },
        { key: "title", label: "Requirement" },
        { key: "responsible_seat", label: "Responsible seat" },
        { key: "evidence_class", label: "Evidence class" },
        { key: "verification_method", label: "Verification" },
        { key: "mitigation_template", label: "Mitigation" },
        { key: "status", label: "Status" },
      ],
      groups,
    },
    {
      type: "finding_list",
      title: "Escalation triggers and consequences",
      items: findings,
    },
    {
      type: "narrative",
      title: "Platform participation",
      body: PLATFORM_PARTICIPATION,
    },
    {
      type: "signature_block",
      title: "Acknowledgment of receipt",
      statement:
        "The undersigned acknowledges receipt of this controlled document at the revision stated, accepts the controls assigned to its seat, and agrees to the upload cadence and verification method set out above.",
      signatories: ["Construction Manager", "Design team lead", "Subcontractor representative"],
    },
  ];

  return {
    meta,
    sections,
    citations: citationsFor(specs, scoring),
    confidence: scoring.composite?.confidence ?? 0,
    unresolvedInputs: unresolved,
  };
};

/* -------------------------------------------- generator 7 — stage gate */

const stageGateGenerator: Generator = (ctx) => {
  const { scoring, stageNumber } = ctx;
  const meta = baseMeta(ctx, false);
  const gate = scoring.gate;
  const unresolved: string[] = [];

  if (!gate) {
    return {
      meta,
      sections: [
        {
          type: "narrative",
          title: "Gate verdict",
          body: ["The control register has not loaded; no gate verdict can be stated."],
        },
      ],
      citations: [],
      confidence: 0,
      unresolvedInputs: ["Control register unavailable"],
    };
  }

  const openIds = new Set(gate.criticalOpen.map((c) => c.control_id));
  const openSpecs = scoring.register.filter((c) => openIds.has(c.control_id));
  const irreversible = new Set(gate.criticalIrreversibleOpen);

  const criteriaRow = (c: {
    criterion_id: string;
    exit_criterion: string;
    evidence_required: string;
  }) => {
    const hit = gate.unsatisfiedCriteria.find(
      (u) => u.criterion.criterion_id === c.criterion_id,
    );
    return {
      criterion_id: c.criterion_id,
      exit_criterion: c.exit_criterion,
      evidence_required: c.evidence_required,
      satisfied: !hit,
      open: hit?.open ?? [],
    };
  };

  if (gate.criticalWithoutSeat.length)
    unresolved.push(
      `${gate.criticalWithoutSeat.length} CRITICAL controls have no named responsible seat: ${gate.criticalWithoutSeat.slice(0, 8).join(", ")}`,
    );
  if (gate.confidence < 60)
    unresolved.push(
      `Stage confidence is ${gate.confidence}% — below the 60% floor, so the verdict is published with its gaps rather than as a clean number`,
    );

  const sections: ReportSection[] = [
    {
      type: "narrative",
      title: "Gate verdict",
      body: [
        `Verdict: ${gate.verdict}.`,
        `Completeness ${gate.completeness}% — ${gate.verified} of ${gate.applicable} applicable controls are Complete — Verified at stage ${stageNumber} (${stageName(stageNumber)}). Stage confidence ${gate.confidence}%.`,
        gate.reasons.length
          ? `What must close before this gate releases: ${gate.reasons.join("; ")}.`
          : "No open conditions were identified against this stage.",
      ],
    },
    {
      type: "exit_criteria_status",
      title: "Exit criteria — hard and soft",
      hard: gate.hardCriteria.map(criteriaRow),
      soft: gate.softCriteria.map(criteriaRow),
    },
    {
      type: "control_table",
      title: "Critical open controls",
      columns: [
        { key: "control_id", label: "Control" },
        { key: "requirement", label: "Requirement" },
        { key: "responsible_seat", label: "Responsible seat" },
        { key: "status", label: "Status" },
      ],
      groups: [
        {
          label: `${gate.criticalOpen.length} CRITICAL controls not Complete — Verified`,
          rows: gate.criticalOpen.map((c) => {
            const spec = scoring.register.find((s) => s.control_id === c.control_id);
            return {
              control_id: c.control_id,
              requirement: spec?.title || c.requirement,
              responsible_seat:
                spec?.responsible_seat || spec?.primary_owner_role || "— NO NAMED SEAT —",
              status: statusLabel(c.status),
            };
          }),
        },
      ],
    },
    {
      type: "finding_list",
      title: "Critical and irreversible open",
      items: [...irreversible].map((id) => {
        const spec = scoring.register.find((s) => s.control_id === id);
        return {
          headline: `${id} · ${spec?.title ?? "Control"}`,
          detail:
            spec?.downstream_exposure ||
            spec?.objective ||
            "No downstream exposure recorded for this control.",
          severity: "Critical",
          consequence:
            "Irreversibility VERY_HIGH — once the stage releases, this cannot be recovered without rework or claim.",
        };
      }),
    },
    {
      type: "signature_block",
      title: "Gate decision",
      statement: `The undersigned record the gate decision for stage ${stageNumber} on the basis of the evidence stated above. A READY verdict may not be recorded while any hard exit criterion is open.`,
      signatories: ["Owner", "Lender", "Construction Manager"],
    },
  ];

  return {
    meta,
    sections,
    citations: citationsFor(openSpecs, scoring),
    confidence: gate.confidence,
    unresolvedInputs: unresolved,
  };
};

/* ------------------------------------ generator 10 — time, money & grades */

const gradeFor = (
  completeness: number,
): { grade: string; tone: "good" | "warn" | "bad" | "neutral" } =>
  completeness >= 90
    ? { grade: "A", tone: "good" }
    : completeness >= 80
      ? { grade: "B", tone: "good" }
      : completeness >= 70
        ? { grade: "C", tone: "warn" }
        : completeness >= 60
          ? { grade: "D", tone: "warn" }
          : { grade: "F", tone: "bad" };

const STAGE_KPI: Record<number, string> = {
  1: "Basis of cost — land, entitlement assumptions and underwriting inputs evidenced before close",
  2: "Conditions of approval priced and scheduled before they become a cost event",
  3: "Design completeness against the budget the equity was raised on",
  4: "GMP integrity — scope gaps, allowances and contingency sized to the risk carried",
  5: "Cost and schedule growth controlled and evidenced as it happens",
  6: "Closeout evidence secured while the trades are still on site and payable",
  7: "Sellout and turnover exposure closed out of the record",
};

const timeMoneyGenerator: Generator = (ctx) => {
  const { scoring, stageNumber, project } = ctx;
  const meta = baseMeta(ctx, true);
  const unresolved: string[] = [];
  const fin = ctx.finance ?? null;
  const d: FinanceDerived | null = deriveFinance(fin);
  const funded = hasFinance(fin);

  if (!funded)
    unresolved.push(
      "No budget or schedule facts have been captured for this project — every money figure below is withheld rather than estimated. Enter contract sum, contingency, committed capital and the baseline and forecast completion dates on the project record.",
    );

  /* --- phase report card ------------------------------------------------ */
  const phaseRows = [1, 2, 3, 4, 5, 6, 7].map((s) => {
    const specs = scoring.register.filter(
      (c) => (c.continuous ? c.stage_number <= s : c.stage_number === s) &&
        instStatus(scoring, c.control_id) !== "N/A",
    );
    const verified = specs.filter(
      (c) => instStatus(scoring, c.control_id) === "COMPLETE_VERIFIED",
    ).length;
    const completeness = specs.length ? Math.round((verified / specs.length) * 100) : 0;
    const state = s < stageNumber ? "PASSED" : s === stageNumber ? "IN PROGRESS" : "NOT STARTED";
    const g =
      specs.length === 0
        ? { grade: "—", tone: "neutral" as const }
        : s > stageNumber
          ? { grade: "NOT RATED", tone: "neutral" as const }
          : gradeFor(completeness);
    return {
      stage: s,
      phase: stageName(s),
      state,
      applicable: specs.length,
      verified,
      completeness,
      grade: g.grade,
      tone: g.tone,
      kpi: STAGE_KPI[s] ?? "",
    };
  });

  const rated = phaseRows.filter((r) => r.grade !== "—" && r.grade !== "NOT RATED");
  const overall = rated.length
    ? Math.round(rated.reduce((a, r) => a + r.completeness, 0) / rated.length)
    : 0;
  const overallGrade = rated.length ? gradeFor(overall).grade : "NOT RATED";

  /* --- money and time metrics ------------------------------------------ */
  const withheld = "WITHHELD — not captured";
  const money: {
    label: string;
    value: string;
    sub: string;
    tone: "good" | "warn" | "bad" | "neutral";
  }[] = [
    {
      label: "Contract sum",
      value: fin && fin.contract_sum_usd > 0 ? usd(fin.contract_sum_usd) : withheld,
      sub: "Executed construction contract at this revision",
      tone: "neutral",
    },
    {
      label: "Total project cost",
      value: d && d.totalCost > 0 ? usd(d.totalCost) : withheld,
      sub: "Land plus hard plus soft cost as captured",
      tone: "neutral",
    },
    {
      label: "Change orders",
      value: d?.coPct === null || !d ? withheld : `${usd((fin?.change_orders_approved_usd ?? 0) + (fin?.change_orders_pending_usd ?? 0))} · ${pct(d.coPct)}`,
      sub: "Approved plus pending, as a share of contract sum",
      tone: (d?.coPct ?? 0) >= 10 ? "bad" : (d?.coPct ?? 0) >= 5 ? "warn" : "good",
    },
    {
      label: "Contingency remaining",
      value:
        d && fin && fin.contingency_total_usd > 0
          ? `${usd(d.contingencyRemaining)} of ${usd(fin.contingency_total_usd)}`
          : withheld,
      sub: d?.contingencyBurnPct === null || !d ? "No contingency captured" : `${pct(d.contingencyBurnPct)} drawn`,
      tone:
        (d?.contingencyBurnPct ?? 0) >= 75 ? "bad" : (d?.contingencyBurnPct ?? 0) >= 50 ? "warn" : "good",
    },
    {
      label: "Schedule position",
      value: d?.slipDays === null || !d ? withheld : `${d.slipDays > 0 ? "+" : ""}${d.slipDays} days`,
      sub: "Forecast substantial completion against baseline",
      tone: (d?.slipDays ?? 0) > 60 ? "bad" : (d?.slipDays ?? 0) > 0 ? "warn" : "good",
    },
    {
      label: "Cost of the slip",
      value: d?.slipCostUsd === null || !d ? withheld : usd(d.slipCostUsd),
      sub: "Liquidated damages plus carry across the delayed days",
      tone: (d?.slipCostUsd ?? 0) > 0 ? "warn" : "good",
    },
    {
      label: "Capital committed",
      value: d && d.capitalCommitted > 0 ? usd(d.capitalCommitted) : withheld,
      sub: "Equity plus debt on the record",
      tone: "neutral",
    },
    {
      label: "Funding headroom",
      value: d?.fundingGapUsd === null || !d ? withheld : usd(d.fundingGapUsd),
      sub:
        (d?.fundingGapUsd ?? 0) < 0
          ? "Committed capital does not cover cost plus pending exposure — a capital call is indicated"
          : "Committed capital less cost, pending change orders and delay cost",
      tone: (d?.fundingGapUsd ?? 1) < 0 ? "bad" : "good",
    },
    {
      label: "Loan maturity headroom",
      value:
        d?.maturityHeadroomDays === null || !d ? withheld : `${d.maturityHeadroomDays} days`,
      sub: "Forecast completion against the stated maturity date",
      tone:
        (d?.maturityHeadroomDays ?? 999) < 0
          ? "bad"
          : (d?.maturityHeadroomDays ?? 999) < 90
            ? "warn"
            : "good",
    },
  ];

  /* --- exposure carried in the register, not yet in the budget ---------- */
  const openCritical = scoring.register.filter(
    (c) =>
      (c.continuous ? c.stage_number <= stageNumber : c.stage_number === stageNumber) &&
      (c.criticality === "CRITICAL" || c.criticality === "HIGH") &&
      instStatus(scoring, c.control_id) !== "COMPLETE_VERIFIED" &&
      instStatus(scoring, c.control_id) !== "N/A",
  );

  const findings = openCritical.slice(0, 20).map((c) => ({
    headline: `${c.control_id} · ${c.title || c.requirement}`,
    detail:
      c.downstream_exposure ||
      c.objective ||
      "No downstream cost or schedule consequence recorded against this control.",
    severity: c.criticality === "CRITICAL" ? "Critical" : "High",
    consequence:
      c.irreversibility === "VERY_HIGH" || c.irreversibility === "HIGH"
        ? "Irreversible at this stage — the cost of closing it later is recovered through change order or claim, not through management."
        : "Recoverable now; cost grows with every week it stays open.",
  }));

  if (openCritical.length)
    unresolved.push(
      `${openCritical.length} critical or high controls at this stage are not Complete — Verified. Their cost consequence is stated qualitatively above and is NOT included in the money figures, which report only captured facts.`,
    );

  const sections: ReportSection[] = [
    {
      type: "narrative",
      title: "What this report answers",
      body: [
        `${project.name} — a partner-facing read on the two questions capital actually asks: is this project going to cost more than we committed, and is it going to take longer than we underwrote.`,
        "Every figure below is a captured fact from the project record or a straight arithmetic consequence of one. Nothing is modelled, forecast or smoothed. Where an input has not been captured, the figure is withheld and named in the unresolved inputs at the end rather than filled with a plausible number.",
        `Overall position at stage ${stageNumber} (${stageName(stageNumber)}): grade ${overallGrade} across ${rated.length} rated phases, composite confidence ${scoring.composite?.confidence ?? 0}%.`,
      ],
    },
    {
      type: "metric_grid",
      title: "Time and money position",
      note: funded
        ? null
        : "No budget or schedule facts captured — all money figures withheld.",
      metrics: money,
    },
    {
      type: "grade_card",
      title: "Phase report card",
      note: `One grade per phase, measured as verified controls over applicable controls. Phases ahead of the current stage are NOT RATED — an unstarted phase is not a failing phase, and unknown is never scored as green. Overall grade ${overallGrade} (${overall}%).`,
      rows: phaseRows,
    },
    {
      type: "aspect_summary",
      title: "Where the exposure sits by aspect",
      index: scoring.composite?.index ?? null,
      confidence: scoring.composite?.confidence ?? 0,
      band: scoring.composite?.band ?? "INSUFFICIENT",
      withheldReason:
        scoring.composite && scoring.composite.index === null
          ? `Composite index withheld: confidence is ${scoring.composite.confidence}%, below the 60% publication floor. The gaps are published in its place.`
          : null,
      rows: scoring.scores.map((s) => ({
        aspect_id: s.aspect_id,
        aspect_name: s.aspect_name,
        score: s.score,
        band: s.band,
        verified: s.verified,
        controls: s.controls,
        weighted: false,
      })),
    },
    {
      type: "finding_list",
      title: "Open items with a cost or schedule consequence",
      items: findings,
    },
    {
      type: "narrative",
      title: "Capital call position",
      body: [
        d && d.fundingGapUsd !== null && d.fundingGapUsd < 0
          ? `Committed capital is short of captured cost plus pending change orders and delay cost by ${usd(Math.abs(d.fundingGapUsd))}. On the record as it stands, a capital call is indicated and should be raised with partners before the shortfall is absorbed by contingency.`
          : d && d.fundingGapUsd !== null
            ? `Committed capital currently covers captured cost plus pending change orders and delay cost with ${usd(d.fundingGapUsd)} of headroom. That headroom is not a reserve — it is what remains before a call becomes necessary.`
            : "A capital call position cannot be stated: committed equity and debt have not been captured on the project record.",
        (d?.contingencyBurnPct ?? 0) >= 50
          ? `Contingency is ${pct(d?.contingencyBurnPct ?? null)} drawn at stage ${stageNumber}. Contingency drawn ahead of the work it was carried for is the earliest reliable indicator of a later call.`
          : "Contingency draw is within the range expected for this stage on the figures captured.",
        `${openCritical.length} critical or high controls remain open at this stage. Each is a cost event that has not yet been priced; they are listed above with the consequence of leaving them open.`,
      ],
    },
    {
      type: "signature_block",
      title: "Issued to partners",
      statement:
        "This report is issued to the ownership group, its equity partners and its lender. The figures are drawn from the project record at the revision stated; any figure marked withheld reflects an input that has not been captured, not a figure that is zero.",
      signatories: ["Sponsor / Managing member", "Equity partner representative", "Lender"],
    },
  ];

  return {
    meta,
    sections,
    citations: citationsFor(openCritical, scoring),
    confidence: scoring.composite?.confidence ?? 0,
    unresolvedInputs: unresolved,
  };
};

/* --------------------------------------------------------- generator map */


export const GENERATORS: Record<string, Generator> = {
  RISK_MITIGATION_PLAN: rmpGenerator,
  STAGE_GATE: stageGateGenerator,
};

export const isImplemented = (key: string) => Boolean(GENERATORS[key]);

export function generateReport(ctx: GeneratorContext): GeneratedReport | null {
  const gen = GENERATORS[ctx.definition.report_key];
  return gen ? gen(ctx) : null;
}

export const fetchEscalationRules = fetchSpecRules;

/* ------------------------------------------------------------ persistence */

export type ReportStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED";

export interface ReportRow {
  id: string;
  project_id: number;
  report_key: string;
  doc_number: string;
  revision: number;
  status: ReportStatus;
  published_at: string | null;
  snapshot_id: string | null;
  payload: GeneratedReport;
  created_at: string;
}

/** Supabase's generated Json type is structural; serialise through it. */
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as never;

const toRow = (r: Record<string, unknown>): ReportRow => ({
  id: String(r["id"]),
  project_id: Number(r["project_id"]),
  report_key: String(r["report_key"]),
  doc_number: String(r["doc_number"] ?? ""),
  revision: Number(r["revision"] ?? 1),
  status: String(r["status"]) as ReportStatus,
  published_at: (r["published_at"] as string | null) ?? null,
  snapshot_id: (r["snapshot_id"] as string | null) ?? null,
  payload: r["payload"] as GeneratedReport,
  created_at: String(r["created_at"]),
});

export async function fetchReports(projectId: number): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => toRow(r as unknown as Record<string, unknown>));
}

export async function nextRevision(projectId: number, reportKey: string): Promise<number> {
  const { count, error } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("report_key", reportKey);
  if (error) throw error;
  return (count ?? 0) + 1;
}

/** Every generation is a new row. A published row is never mutated. */
export async function saveDraft(report: GeneratedReport): Promise<ReportRow> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("reports")
    .insert({
      project_id: report.meta.project_id,
      report_key: report.meta.report_key,
      doc_number: report.meta.doc_number,
      revision: report.meta.revision,
      status: "DRAFT",
      generated_by: auth.user?.id ?? null,
      payload: json(report),
    })
    .select("*")
    .single();
  if (error) throw error;
  return toRow(data as unknown as Record<string, unknown>);
}

export async function advanceStatus(
  row: ReportRow,
  status: Exclude<ReportStatus, "PUBLISHED">,
): Promise<ReportRow> {
  const { data: auth } = await supabase.auth.getUser();
  const patch: { status: ReportStatus; approved_by?: string | null } = { status };
  if (status === "APPROVED") patch.approved_by = auth.user?.id ?? null;
  const { data, error } = await supabase
    .from("reports")
    .update(patch)
    .eq("id", row.id)
    .select("*")
    .single();
  if (error) throw error;
  return toRow(data as unknown as Record<string, unknown>);
}

/** Publishing writes the immutable, hash-chained snapshot first, then seals the row. */
export async function publishReport(row: ReportRow): Promise<ReportRow> {
  const { data: auth } = await supabase.auth.getUser();
  const { data: snap, error: snapError } = await supabase
    .from("report_snapshots")
    .insert({
      report_id: row.id,
      project_id: row.project_id,
      captured_by: auth.user?.id ?? null,
      payload: json(row.payload),
      content_hash: "pending",
    })
    .select("id, content_hash, prev_hash")
    .single();
  if (snapError) throw snapError;

  const { data, error } = await supabase
    .from("reports")
    .update({
      status: "PUBLISHED",
      published_at: new Date().toISOString(),
      snapshot_id: (snap as { id: string }).id,
    })
    .eq("id", row.id)
    .select("*")
    .single();
  if (error) throw error;
  return toRow(data as unknown as Record<string, unknown>);
}

export async function fetchSnapshot(
  snapshotId: string,
): Promise<{ content_hash: string; prev_hash: string | null; captured_at: string } | null> {
  const { data, error } = await supabase
    .from("report_snapshots")
    .select("content_hash, prev_hash, captured_at")
    .eq("id", snapshotId)
    .maybeSingle();
  if (error) throw error;
  return (data as { content_hash: string; prev_hash: string | null; captured_at: string }) ?? null;
}
