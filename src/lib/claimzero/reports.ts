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
  // The Development Control Report Card section. Present in the rendered
  // section union (see `type: "transcript"` below) and handled by both
  // renderers (report-doc.tsx, report-html.ts) since inception, but it was
  // missing here — so a stored report_definitions.sections entry of this type
  // was untypable. Defect D-03.
  "transcript",
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

/**
 * NO FINDING WITHOUT A REMEDY.
 *
 * Binding rule (REPORT_STYLE.md). Every failing or at-risk line in every
 * ClaimZero report carries the specific work that raises it, the named seat
 * accountable for doing it, what it costs and the date it is required by.
 * A mark without a remedy is a complaint, not intelligence.
 *
 * `cost` and `requiredBy` are withheld rather than estimated when the facts
 * have not been captured — the withholding is itself the finding.
 */
export interface Remedy {
  /** The specific work that raises the mark. Never "monitor" or "review". */
  work: string;
  /** Named responsible seat. Never a company, never blank. */
  seat: string;
  /** Cost of the remedy, or an explicit withholding. */
  cost: string;
  /** Date the work must be complete by, or the gate it must precede. */
  requiredBy: string;
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
      items: {
        headline: string;
        detail: string;
        severity: string;
        consequence: string;
        remedy: Remedy;
      }[];
    }

  | {
      type: "chronology";
      title: string;
      entries: { date: string; event: string; owner: string; source: string }[];
    }
  | {
      /**
       * The Development Control Report Card. Each aspect is a subject, credits
       * are proportional to applicable control mass at the current stage, and
       * the mark is 100 minus the aspect risk score — HIGH IS GOOD. This is the
       * deliberate inverse of the risk index: owners read grades intuitively,
       * risk indices they do not. Subjects with no applicable control at this
       * stage are N/A and excluded from the term grade — never counted as
       * passing.
       */
      type: "transcript";
      title: string;
      note: string | null;
      subjects: {
        aspect_id: string;
        aspect_name: string;
        owner_question: string;
        /** null = N/A, excluded from the term grade. */
        mark: number | null;
        letter: string;
        gradePoints: number | null;
        credits: number;
        controls: number;
        verified: number;
        confidence: number;
        band: string;
        tone: "good" | "warn" | "bad" | "neutral";
        /** Required on every subject below the pass mark. */
        remedy: Remedy | null;
      }[];
      termGrade: {
        mark: number | null;
        letter: string;
        gpa: number | null;
        credits: number;
        subjectsGraded: number;
        subjectsNotApplicable: number;
        tone: "good" | "warn" | "bad" | "neutral";
      };
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

import { stageName, STAGE_NUMBERS } from "./stages";
export { stageName };



const today = () =>
  new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

/* ------------------------------------------- NO FINDING WITHOUT A REMEDY */

const NO_SEAT = "— NO NAMED SEAT — assign before this report is issued";
const NOT_QUOTED = "Not yet quoted — obtain a figure from the responsible seat";

const gateDeadline = (stageNumber: number, urgent: boolean) =>
  urgent
    ? `Immediately — irreversible at this stage; every week compounds the cost`
    : `Before the Stage ${stageNumber} · ${stageName(stageNumber)} gate`;

/** The specific work that closes an open control, tied to a seat and a date. */
function remedyForControl(c: ControlSpec, stageNumber: number): Remedy {
  const spec = c as ControlSpec & { mitigation_template?: string | null };
  const urgent =
    c.irreversibility === "VERY_HIGH" ||
    c.irreversibility === "HIGH" ||
    c.criticality === "CRITICAL";
  return {
    work:
      (spec.mitigation_template || "").trim() ||
      (c.objective || "").trim() ||
      `Produce ${c.expected_evidence || "the required evidence"} and have it verified against ${c.control_id}.`,
    seat: (c.responsible_seat || c.primary_owner_role || "").trim() || NO_SEAT,
    cost: NOT_QUOTED,
    requiredBy: gateDeadline(stageNumber, urgent),
  };
}

/** The specific work that clears an escalation trigger before it fires. */
function remedyForRule(r: SpecEscalationRule, stageNumber: number): Remedy {
  const urgent = /CRITICAL|SEVERE/i.test(r.severity_floor || "");
  return {
    work:
      (r.action || "").trim() ||
      `Close the conditions that trigger ${r.rule_id || r.name} and record the evidence against the controls it watches.`,
    seat: NO_SEAT,
    cost: NOT_QUOTED,
    requiredBy: gateDeadline(stageNumber, urgent),
  };
}


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
    remedy: remedyForRule(r, stageNumber),
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
          remedy: spec
            ? remedyForControl(spec, stageNumber)
            : {
                work: `Locate control ${id} in the register and restore its specification — the gate cannot be decided against a control the register cannot describe.`,
                seat: NO_SEAT,
                cost: NOT_QUOTED,
                requiredBy: gateDeadline(stageNumber, true),
              },

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
  3: "Design intent fixed against the programme and the budget the equity was raised on",
  4: "Design completeness and coordination proven before the set goes out to price",
  5: "GMP integrity — scope gaps, allowances and contingency sized to the risk carried",
  6: "Cost and schedule growth controlled and evidenced as it happens",
  7: "Takeout secured — the capital event that retires construction debt, evidenced before maturity",
  8: "Closeout evidence secured while the trades are still on site and payable",
  9: "Sellout and turnover exposure closed out of the record",
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
  const phaseRows = STAGE_NUMBERS.map((s) => {
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
    remedy: remedyForControl(c, stageNumber),
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

/* ----------------------- generator — development control report card */

/**
 * Standard academic scale applied to the mark. The mark is 100 minus the
 * aspect risk score, so HIGH IS GOOD — the deliberate inverse of the risk
 * index. Colour appears alongside the letter and the percentage, never
 * instead of them.
 */
const LETTER_SCALE: {
  min: number;
  letter: string;
  points: number;
  tone: "good" | "warn" | "bad";
}[] = [
  { min: 93, letter: "A", points: 4.0, tone: "good" },
  { min: 90, letter: "A−", points: 3.7, tone: "good" },
  { min: 87, letter: "B+", points: 3.3, tone: "good" },
  { min: 83, letter: "B", points: 3.0, tone: "good" },
  { min: 80, letter: "B−", points: 2.7, tone: "good" },
  { min: 77, letter: "C+", points: 2.3, tone: "warn" },
  { min: 73, letter: "C", points: 2.0, tone: "warn" },
  { min: 70, letter: "C−", points: 1.7, tone: "warn" },
  { min: 67, letter: "D+", points: 1.3, tone: "warn" },
  { min: 63, letter: "D", points: 1.0, tone: "warn" },
  { min: 60, letter: "D−", points: 0.7, tone: "warn" },
  { min: -Infinity, letter: "F", points: 0.0, tone: "bad" },
];

const markToGrade = (mark: number) =>
  LETTER_SCALE.find((g) => mark >= g.min) ?? LETTER_SCALE[LETTER_SCALE.length - 1]!;

/** Below this mark a subject carries a mandatory remedy. */
const PASS_MARK = 80;

const half = (n: number) => Math.max(0.5, Math.round(n * 2) / 2);

const reportCardGenerator: Generator = (ctx) => {
  const { scoring, stageNumber, project } = ctx;
  const meta = baseMeta(ctx, true);
  const unresolved: string[] = [];

  /* Applicable controls at this stage, by aspect — the control mass that
     credits are proportional to. */
  const applicable = scoring.register.filter((c) =>
    c.continuous ? c.stage_number <= stageNumber : c.stage_number === stageNumber,
  );
  const openByAspect = new Map<string, ControlSpec[]>();
  for (const c of applicable) {
    if (instStatus(scoring, c.control_id) === "COMPLETE_VERIFIED") continue;
    if (instStatus(scoring, c.control_id) === "N/A") continue;
    const list = openByAspect.get(c.aspect_id ?? "UNMAPPED") ?? [];
    list.push(c);
    openByAspect.set(c.aspect_id ?? "UNMAPPED", list);
  }

  const rated = scoring.scores.filter((s) => s.score !== null && s.applicableWeight > 0);
  const naCount = scoring.scores.length - rated.length;
  const totalWeight = rated.reduce((a, s) => a + s.applicableWeight, 0);

  /* Credits are proportional to applicable control mass, scaled so a typical
     subject reads as a 3-credit course on a normal transcript. */
  const creditFor = (weight: number) =>
    totalWeight > 0 && rated.length > 0
      ? half((weight / totalWeight) * rated.length * 3)
      : 0;

  const subjects = scoring.scores
    .slice()
    .sort((a, b) => a.aspect_id.localeCompare(b.aspect_id))
    .map((s) => {
      const applies = s.score !== null && s.applicableWeight > 0;
      if (!applies) {
        return {
          aspect_id: s.aspect_id,
          aspect_name: s.aspect_name,
          owner_question: s.owner_question,
          mark: null,
          letter: "N/A",
          gradePoints: null,
          credits: 0,
          controls: s.controls,
          verified: s.verified,
          confidence: s.confidence,
          band: s.band,
          tone: "neutral" as const,
          remedy: null,
        };
      }
      const mark = Math.max(0, Math.min(100, Math.round(100 - (s.score as number))));
      const g = markToGrade(mark);
      const worst =
        (openByAspect.get(s.aspect_id) ?? [])
          .slice()
          .sort((a, b) => {
            const rank = (c: ControlSpec) =>
              (c.criticality === "CRITICAL" ? 2 : c.criticality === "HIGH" ? 1 : 0) +
              (c.irreversibility === "VERY_HIGH" ? 2 : c.irreversibility === "HIGH" ? 1 : 0);
            return rank(b) - rank(a);
          })[0] ?? null;

      let remedy: Remedy | null = null;
      if (mark < PASS_MARK) {
        remedy = worst
          ? remedyForControl(worst, stageNumber)
          : {
              work: `${s.aspect_name} is marked ${mark}% with no open control to attribute it to. Re-verify the evidence behind this aspect — a mark this low with nothing open means the register is out of step with the record.`,
              seat: NO_SEAT,
              cost: NOT_QUOTED,
              requiredBy: gateDeadline(stageNumber, false),
            };
        if (remedy.seat === NO_SEAT)
          unresolved.push(
            `${s.aspect_id} · ${s.aspect_name} is below the pass mark and its remedy has no named seat — the work cannot be enforced against an unnamed party`,
          );
      }

      return {
        aspect_id: s.aspect_id,
        aspect_name: s.aspect_name,
        owner_question: s.owner_question,
        mark,
        letter: g.letter,
        gradePoints: g.points,
        credits: creditFor(s.applicableWeight),
        controls: s.controls,
        verified: s.verified,
        confidence: s.confidence,
        band: s.band,
        tone: g.tone,
        remedy,
      };
    });

  /* Term grade — credit weighted, N/A subjects excluded entirely. Never
     counted as passing. */
  const graded = subjects.filter((s) => s.mark !== null && s.credits > 0);
  const credits = graded.reduce((a, s) => a + s.credits, 0);
  const termMark = credits
    ? Math.round(graded.reduce((a, s) => a + (s.mark as number) * s.credits, 0) / credits)
    : null;
  const gpa = credits
    ? Math.round(
        (graded.reduce((a, s) => a + (s.gradePoints as number) * s.credits, 0) / credits) * 100,
      ) / 100
    : null;
  const termLetter = termMark === null ? "N/A" : markToGrade(termMark).letter;
  const termTone = termMark === null ? ("neutral" as const) : markToGrade(termMark).tone;

  if (naCount)
    unresolved.push(
      `${naCount} of ${scoring.scores.length} aspects carry no applicable control at stage ${stageNumber} and are marked N/A — they are excluded from the term grade rather than counted as passing`,
    );
  if (!credits)
    unresolved.push(
      "No aspect carries applicable control mass at this stage — a term grade cannot be stated",
    );

  const failing = subjects.filter((s) => s.mark !== null && s.mark < PASS_MARK);

  const sections: ReportSection[] = [
    {
      type: "narrative",
      title: "How to read this report card",
      body: [
        `This grades ${project.name} the way a transcript grades a term. Each of the ${scoring.scores.length} control aspects is a subject. Credits are proportional to how much applicable control mass that subject carries at Stage ${stageNumber} · ${stageName(stageNumber)} — a subject governing more of the work is worth more of the grade.`,
        "The mark is 100 minus the aspect risk score. HIGH IS GOOD. This is the deliberate inverse of the risk index shown elsewhere in the platform, because an Owner reads a grade intuitively and a risk index they do not. The two never disagree; they are the same number read from opposite ends.",
        "A subject with no applicable control at this stage is marked N/A and excluded from the term grade. It is never counted as passing. Colour is shown alongside the letter and the percentage, never instead of them.",
        `Every subject below ${PASS_MARK}% carries the specific work that raises it, the seat accountable for doing it, what it costs and the date it is required by. A mark without a remedy is a complaint, not intelligence.`,
      ],
    },
    {
      type: "transcript",
      title: "Subject grades",
      note: `Term grade is credit weighted across ${graded.length} graded subjects; ${naCount} subject${naCount === 1 ? " is" : "s are"} not applicable at this stage and excluded.`,
      subjects,
      termGrade: {
        mark: termMark,
        letter: termLetter,
        gpa,
        credits: Math.round(credits * 2) / 2,
        subjectsGraded: graded.length,
        subjectsNotApplicable: naCount,
        tone: termTone,
      },
    },
    {
      type: "finding_list",
      title: `Subjects below the pass mark — required work`,
      items: failing.map((s) => ({
        headline: `${s.aspect_id} · ${s.aspect_name} — ${s.letter} (${s.mark}%)`,
        detail: s.owner_question,
        severity: (s.mark as number) < 60 ? "Critical" : "High",
        consequence: `${s.verified} of ${s.controls} controls in this subject are verified. Carrying ${s.credits} credits, it is pulling the term grade down by the largest single amount available to it.`,
        remedy: s.remedy ?? {
          work: "Remedy not stated — this report may not be issued in this condition.",
          seat: NO_SEAT,
          cost: NOT_QUOTED,
          requiredBy: gateDeadline(stageNumber, true),
        },
      })),
    },
    {
      type: "signature_block",
      title: "Issued to the ownership group",
      statement: `This report card states the grade for Stage ${stageNumber} · ${stageName(stageNumber)} on the evidence in the record at revision ${ctx.revision}. Marks are computed, not opinion; every subject below the pass mark carries the work required to raise it.`,
      signatories: ["Owner / Sponsor", "Construction Manager", "ClaimZero reviewer"],
    },
  ];

  return {
    meta,
    sections,
    citations: citationsFor(
      failing.flatMap((s) => openByAspect.get(s.aspect_id) ?? []).slice(0, 30),
      scoring,
    ),
    confidence: scoring.composite?.confidence ?? 0,
    unresolvedInputs: unresolved,
  };
};

/* ================================================================= shared
   Section builders used by the remaining ten generators. Every one of them
   reads the same live register, scoring and escalation inputs the four
   original generators read — nothing here is bespoke narrative dressed as
   data, and nothing is estimated. Where an input is absent the section says
   so in unresolvedInputs rather than filling the gap.
   ========================================================================= */

const isOpen = (scoring: ProjectScoring, id: string) => {
  const s = instStatus(scoring, id);
  return s !== "COMPLETE_VERIFIED" && s !== "N/A";
};

/** Applicable, non-N/A controls at a stage (or an explicit list of stages). */
function specsFor(
  scoring: ProjectScoring,
  stageNumber: number,
  stages?: number[],
): ControlSpec[] {
  const wanted = stages && stages.length ? stages : [stageNumber];
  return scoring.register.filter(
    (c) =>
      (c.continuous ? c.stage_number <= Math.max(...wanted) : wanted.includes(c.stage_number)) &&
      instStatus(scoring, c.control_id) !== "N/A",
  );
}

const CONTROL_COLUMNS: Column[] = [
  { key: "control_id", label: "Control" },
  { key: "title", label: "Requirement" },
  { key: "responsible_seat", label: "Responsible seat" },
  { key: "evidence_class", label: "Evidence class" },
  { key: "status", label: "Status" },
];

function controlRow(c: ControlSpec, scoring: ProjectScoring): Record<string, string> {
  const inst = scoring.instanceMap.get(c.control_id);
  return {
    control_id: c.control_id,
    title: c.title || c.requirement,
    responsible_seat: c.responsible_seat || c.primary_owner_role || "— NO NAMED SEAT —",
    evidence_class: c.evidence_class || "—",
    verification_method: c.verification_method || "—",
    criticality: c.criticality || "—",
    evidence_ref: inst?.evidence_ref?.trim() || "EVIDENCE NOT LOCATED",
    status: statusLabel(instStatus(scoring, c.control_id)),
  };
}

function controlTable(
  title: string,
  specs: ControlSpec[],
  scoring: ProjectScoring,
  groupLabel: string,
  columns: Column[] = CONTROL_COLUMNS,
): ReportSection {
  return {
    type: "control_table",
    title,
    columns,
    groups: [{ label: groupLabel, rows: specs.map((c) => controlRow(c, scoring)) }],
  };
}

function aspectSummary(title: string, scoring: ProjectScoring): ReportSection {
  return {
    type: "aspect_summary",
    title,
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
  };
}

function exitCriteriaSection(title: string, scoring: ProjectScoring): ReportSection {
  const gate = scoring.gate;
  const row = (c: { criterion_id: string; exit_criterion: string; evidence_required: string }) => {
    const hit = gate?.unsatisfiedCriteria.find((u) => u.criterion.criterion_id === c.criterion_id);
    return {
      criterion_id: c.criterion_id,
      exit_criterion: c.exit_criterion,
      evidence_required: c.evidence_required,
      satisfied: !hit,
      open: hit?.open ?? [],
    };
  };
  return {
    type: "exit_criteria_status",
    title,
    hard: (gate?.hardCriteria ?? []).map(row),
    soft: (gate?.softCriteria ?? []).map(row),
  };
}

/** Open controls, worst first, each carrying a remedy. */
function openFindings(
  title: string,
  specs: ControlSpec[],
  scoring: ProjectScoring,
  stageNumber: number,
  limit = 20,
): ReportSection {
  const rank = (c: ControlSpec) =>
    (c.criticality === "CRITICAL" ? 3 : c.criticality === "HIGH" ? 2 : 1) +
    (c.irreversibility === "VERY_HIGH" ? 3 : c.irreversibility === "HIGH" ? 2 : 0);
  const open = specs
    .filter((c) => isOpen(scoring, c.control_id))
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, limit);
  return {
    type: "finding_list",
    title,
    items: open.map((c) => ({
      headline: `${c.control_id} · ${c.title || c.requirement}`,
      detail:
        c.downstream_exposure ||
        c.objective ||
        "No downstream consequence is recorded against this control.",
      severity: c.criticality === "CRITICAL" ? "Critical" : c.criticality === "HIGH" ? "High" : "Moderate",
      consequence:
        c.irreversibility === "VERY_HIGH" || c.irreversibility === "HIGH"
          ? "Irreversible at this stage — closing it later is recovered by change order or claim, not by management."
          : "Recoverable now; the cost of closing it grows with every week it stays open.",
      remedy: remedyForControl(c, stageNumber),
    })),
  };
}

/**
 * What was knowable, and when. Built only from dated verification events on the
 * record. An undated control is not given a date — it is reported as undated.
 */
function chronologySection(
  title: string,
  specs: ControlSpec[],
  scoring: ProjectScoring,
): { section: ReportSection; undated: number } {
  const entries: { date: string; event: string; owner: string; source: string }[] = [];
  let undated = 0;
  for (const c of specs) {
    const inst = scoring.instanceMap.get(c.control_id);
    if (!inst) continue;
    if (!inst.verified_date) {
      if (instStatus(scoring, c.control_id) === "COMPLETE_VERIFIED") undated += 1;
      continue;
    }
    entries.push({
      date: inst.verified_date,
      event: `${c.control_id} · ${c.title || c.requirement} — ${statusLabel(inst.status)}`,
      owner: inst.verified_by || c.responsible_seat || c.primary_owner_role || "— NO NAMED SEAT —",
      source: inst.evidence_ref?.trim() || "EVIDENCE NOT LOCATED — claim not citable",
    });
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));
  return { section: { type: "chronology", title, entries }, undated };
}

function seatlessNote(specs: ControlSpec[]): string | null {
  const n = specs.filter((c) => !(c.responsible_seat || c.primary_owner_role || "").trim()).length;
  return n
    ? `${n} controls in this issue carry no named responsible seat — accountability is missing, and the report states that rather than implying it is covered`
    : null;
}

function completeness(specs: ControlSpec[], scoring: ProjectScoring) {
  const verified = specs.filter(
    (c) => instStatus(scoring, c.control_id) === "COMPLETE_VERIFIED",
  ).length;
  return {
    verified,
    applicable: specs.length,
    pct: specs.length ? Math.round((verified / specs.length) * 100) : 0,
  };
}

/* -------------------------------- generator 1 — due diligence & feasibility */

const dueDiligenceGenerator: Generator = (ctx) => {
  const { scoring, stageNumber } = ctx;
  const meta = baseMeta(ctx, false);
  const unresolved: string[] = [];
  const specs = specsFor(scoring, stageNumber, [1]);
  const cm = completeness(specs, scoring);
  const blockers = specs.filter(
    (c) =>
      isOpen(scoring, c.control_id) &&
      (c.criticality === "CRITICAL" || c.irreversibility === "VERY_HIGH"),
  );

  if (!specs.length)
    unresolved.push("No Stage 1 controls are applicable under this project profile");
  const seat = seatlessNote(specs);
  if (seat) unresolved.push(seat);
  if (blockers.length)
    unresolved.push(
      `${blockers.length} acquisition controls are critical or irreversible and remain open — a recommendation to proceed cannot be made clean while they stand`,
    );

  const recommendation = blockers.length
    ? `CONDITION OR REPRICE. ${blockers.length} critical or irreversible diligence controls are open. Proceeding without closing them prices unknown risk into the basis rather than into the purchase.`
    : cm.pct >= 80
      ? `PURSUE. ${cm.verified} of ${cm.applicable} diligence controls are verified at ${cm.pct}% completeness with no critical item open on the record.`
      : `NOT YET DECIDABLE. Completeness is ${cm.pct}% — the record is too thin for a proceed recommendation. The gaps below are the diligence still owed, not a negative finding.`;

  return {
    meta,
    sections: [
      {
        type: "narrative",
        title: "Feasibility position",
        body: [
          `${ctx.project.name} — ${ctx.project.city} · ${ctx.project.type} · $${ctx.project.sizeM}M. This report answers one question for the principal and the equity: pursue, acquire, reprice, condition or walk away.`,
          `Basis: ${cm.applicable} applicable Stage 1 controls, ${cm.verified} verified (${cm.pct}% completeness), composite confidence ${scoring.composite?.confidence ?? 0}%.`,
          recommendation,
        ],
      },
      controlTable(
        "Diligence controls",
        specs,
        scoring,
        `${cm.applicable} applicable acquisition controls`,
      ),
      openFindings("Deal-breakers and conditions", blockers.length ? blockers : specs, scoring, stageNumber, 15),
      exitCriteriaSection("Close readiness", scoring),
      {
        type: "signature_block",
        title: "Recommendation",
        statement: recommendation,
        signatories: ["Principal", "Equity"],
      },
    ],
    citations: citationsFor(specs, scoring),
    confidence: scoring.composite?.confidence ?? 0,
    unresolvedInputs: unresolved,
  };
};

/* --------------------------------- generator 2 — entitlement & conditions */

const entitlementGenerator: Generator = (ctx) => {
  const { scoring, stageNumber } = ctx;
  const meta = baseMeta(ctx, false);
  const unresolved: string[] = [];
  const specs = specsFor(scoring, stageNumber, [2]);
  const cm = completeness(specs, scoring);
  const { section: chrono, undated } = chronologySection(
    "Conditions of approval register",
    specs,
    scoring,
  );

  if (!specs.length)
    unresolved.push("No Stage 2 controls are applicable under this project profile");
  if (undated)
    unresolved.push(
      `${undated} verified entitlement controls carry no verification date — they cannot be placed on the conditions chronology, and an undated approval cannot be relied on in a later dispute`,
    );
  const seat = seatlessNote(specs);
  if (seat) unresolved.push(seat);

  return {
    meta,
    sections: [
      {
        type: "narrative",
        title: "Entitlement position",
        body: [
          `Approvals carried by ${ctx.project.name} are only as durable as the conditions attached to them. This report states what must occur, by whom and by when, to preserve them.`,
          `Basis: ${cm.applicable} applicable Stage 2 controls, ${cm.verified} verified (${cm.pct}% completeness).`,
          "A closed regulatory item does not close the underlying obligation. Conditions that survive approval are tracked here until the evidence that discharges them is on the record.",
        ],
      },
      chrono,
      controlTable("Entitlement controls", specs, scoring, `${cm.applicable} applicable entitlement controls`),
      exitCriteriaSection("Entitlement gate", scoring),
      openFindings("Conditions not yet discharged", specs, scoring, stageNumber, 20),
      {
        type: "signature_block",
        title: "Acknowledgment",
        statement:
          "The undersigned acknowledge the conditions of approval recorded above and the seat accountable for discharging each one.",
        signatories: ["Principal", "Land-use counsel"],
      },
    ],
    citations: citationsFor(specs, scoring),
    confidence: scoring.composite?.confidence ?? 0,
    unresolvedInputs: unresolved,
  };
};

/* -------------------------- generator 3 — project assessment for financing */

const financingGenerator: Generator = (ctx) => {
  const { scoring, stageNumber } = ctx;
  const meta = baseMeta(ctx, true);
  const unresolved: string[] = [];
  const specs = specsFor(scoring, stageNumber, [3, 4, 5].filter((s) => s <= stageNumber).length ? [3, 4, 5] : [stageNumber]);
  const cm = completeness(specs, scoring);
  const d = deriveFinance(ctx.finance ?? null);
  const uncited = specs.filter((c) => !scoring.instanceMap.get(c.control_id)?.evidence_ref?.trim());

  if (uncited.length)
    unresolved.push(
      `${uncited.length} of ${specs.length} controls in the evidence base carry no locatable citation — credit committee may not rely on them`,
    );
  if (!hasFinance(ctx.finance ?? null))
    unresolved.push(
      "No budget or schedule facts captured — funding headroom and maturity headroom are withheld rather than estimated",
    );

  const verdict =
    (scoring.composite?.confidence ?? 0) < 60
      ? "NOT READY TO FINANCE ON THIS RECORD. Confidence is below the 60% publication floor; the committee would be underwriting the absence of evidence."
      : cm.pct >= 80
        ? "READY TO FINANCE, SUBJECT TO THE CONDITIONS BELOW."
        : "READY TO FINANCE ONLY WITH CONDITIONS. Completeness is below 80% at the assessed stages.";

  return {
    meta,
    sections: [
      aspectSummary("Composite index and confidence band", scoring),
      {
        type: "metric_grid",
        title: "Capital position",
        note: hasFinance(ctx.finance ?? null) ? null : "No budget facts captured — figures withheld.",
        metrics: [
          {
            label: "Committed capital",
            value: d && d.capitalCommitted > 0 ? usd(d.capitalCommitted) : "WITHHELD — not captured",
            sub: "Equity plus debt on the record",
            tone: "neutral",
          },
          {
            label: "Funding headroom",
            value: d?.fundingGapUsd == null ? "WITHHELD — not captured" : usd(d.fundingGapUsd),
            sub: "Committed capital less captured cost and pending exposure",
            tone: (d?.fundingGapUsd ?? 1) < 0 ? "bad" : "good",
          },
          {
            label: "Maturity headroom",
            value:
              d?.maturityHeadroomDays == null
                ? "WITHHELD — not captured"
                : `${d.maturityHeadroomDays} days`,
            sub: "Forecast completion against stated loan maturity",
            tone: (d?.maturityHeadroomDays ?? 999) < 0 ? "bad" : (d?.maturityHeadroomDays ?? 999) < 90 ? "warn" : "good",
          },
          {
            label: "Evidence completeness",
            value: `${cm.pct}%`,
            sub: `${cm.verified} of ${cm.applicable} controls verified`,
            tone: cm.pct >= 80 ? "good" : cm.pct >= 60 ? "warn" : "bad",
          },
        ],
      },
      controlTable(
        "Evidence base",
        specs,
        scoring,
        `${cm.applicable} controls relied on, ${uncited.length} without a locatable citation`,
        [...CONTROL_COLUMNS, { key: "evidence_ref", label: "Citation" }],
      ),
      openFindings("Credit conditions", specs, scoring, stageNumber, 25),
      exitCriteriaSection("Financing gate", scoring),
      {
        type: "signature_block",
        title: "Credit committee",
        statement: verdict,
        signatories: ["Credit officer"],
      },
    ],
    citations: citationsFor(specs, scoring),
    confidence: scoring.composite?.confidence ?? 0,
    unresolvedInputs: unresolved,
  };
};

/* --------------------------------- generator 5 — weekly intelligence */

const TOP_N = 10;

const weeklyGenerator: Generator = (ctx) => {
  const { scoring, stageNumber } = ctx;
  const meta = baseMeta(ctx, false);
  const unresolved: string[] = [];
  const specs = specsFor(scoring, stageNumber);
  const open = specs.filter((c) => isOpen(scoring, c.control_id));
  const rank = (c: ControlSpec) =>
    (c.criticality === "CRITICAL" ? 3 : c.criticality === "HIGH" ? 2 : 1) +
    (c.irreversibility === "VERY_HIGH" ? 3 : c.irreversibility === "HIGH" ? 2 : 0);
  const top = open.slice().sort((a, b) => rank(b) - rank(a)).slice(0, TOP_N);

  // NO SILENT CAPS.
  if (open.length > TOP_N)
    unresolved.push(
      `This week's report shows the top ${TOP_N} of ${open.length} open controls at this stage. ${open.length - TOP_N} open controls are held back from this view — they are not closed, and they remain on the project Controls tab.`,
    );
  const seat = seatlessNote(top);
  if (seat) unresolved.push(seat);

  const cm = completeness(specs, scoring);

  return {
    meta,
    sections: [
      aspectSummary("Project Risk Index", scoring),
      controlTable(
        "The Top Ten",
        top,
        scoring,
        open.length > TOP_N
          ? `Top ${TOP_N} of ${open.length} open controls — ${open.length - TOP_N} held back, not closed`
          : `${open.length} open controls at this stage`,
        [
          { key: "control_id", label: "Control" },
          { key: "title", label: "What is open" },
          { key: "responsible_seat", label: "Responsible seat" },
          { key: "criticality", label: "Criticality" },
          { key: "status", label: "Status" },
        ],
      ),
      openFindings("What to do about it this week", top, scoring, stageNumber, TOP_N),
      {
        type: "narrative",
        title: "Commentary",
        body: [
          `Stage ${stageNumber} · ${stageName(stageNumber)}. ${cm.verified} of ${cm.applicable} applicable controls are verified — ${cm.pct}% complete, confidence ${scoring.composite?.confidence ?? 0}%.`,
          open.length
            ? `${open.length} controls are open. The ten above are ranked by criticality and irreversibility: the ones where waiting a week costs the most.`
            : "No applicable control is open at this stage on the record as loaded.",
          "Nothing in this report is estimated. Where the record is silent, the silence is reported as a gap and not scored as green.",
        ],
      },
    ],
    citations: citationsFor(top, scoring),
    confidence: scoring.composite?.confidence ?? 0,
    unresolvedInputs: unresolved,
  };
};

/* ---------------------------------- generator 6 — monthly executive */

const monthlyGenerator: Generator = (ctx) => {
  const { scoring, stageNumber } = ctx;
  const meta = baseMeta(ctx, true);
  const unresolved: string[] = [];
  const specs = specsFor(scoring, stageNumber);
  const cm = completeness(specs, scoring);
  const fin = ctx.finance ?? null;
  const d = deriveFinance(fin);
  const funded = hasFinance(fin);
  const withheld = "WITHHELD — not captured";

  if (!funded)
    unresolved.push(
      "No budget or schedule facts captured for this project — the cost and schedule tables report withheld rather than zero",
    );

  const verifiedThisMonth = specs.filter((c) => {
    const dt = scoring.instanceMap.get(c.control_id)?.verified_date;
    if (!dt) return false;
    const then = new Date(dt);
    const now = new Date();
    return (now.getTime() - then.getTime()) / 86400000 <= 31;
  });

  const costRows = [
    { item: "Contract sum", value: fin && fin.contract_sum_usd > 0 ? usd(fin.contract_sum_usd) : withheld },
    {
      item: "Change orders approved",
      value: fin && fin.change_orders_approved_usd > 0 ? usd(fin.change_orders_approved_usd) : withheld,
    },
    {
      item: "Change orders pending",
      value: fin && fin.change_orders_pending_usd > 0 ? usd(fin.change_orders_pending_usd) : withheld,
    },
    {
      item: "Contingency remaining",
      value: d && fin && fin.contingency_total_usd > 0 ? usd(d.contingencyRemaining) : withheld,
    },
    { item: "Contingency drawn", value: d?.contingencyBurnPct == null ? withheld : pct(d.contingencyBurnPct) },
  ].map((r) => ({ item: r.item, value: r.value }));

  const scheduleRows = [
    {
      item: "Baseline substantial completion",
      value: fin?.baseline_substantial_completion ?? withheld,
    },
    {
      item: "Forecast substantial completion",
      value: fin?.forecast_substantial_completion ?? withheld,
    },
    { item: "Slip against baseline", value: d?.slipDays == null ? withheld : `${d.slipDays} days` },
    { item: "Cost of the slip", value: d?.slipCostUsd == null ? withheld : usd(d.slipCostUsd) },
    { item: "Loan maturity", value: fin?.loan_maturity ?? withheld },
  ];

  return {
    meta,
    sections: [
      {
        type: "narrative",
        title: "The month in one paragraph",
        body: [
          `${ctx.project.name} closed the month at ${cm.pct}% control completeness — ${cm.verified} of ${cm.applicable} applicable controls verified at Stage ${stageNumber} · ${stageName(stageNumber)}, on ${scoring.composite?.confidence ?? 0}% confidence. ${verifiedThisMonth.length} controls were verified in the last thirty-one days.`,
          d?.slipDays != null && d.slipDays > 0
            ? `Schedule is ${d.slipDays} days behind the baseline, carrying ${d.slipCostUsd == null ? "an unquantified" : usd(d.slipCostUsd)} cost in liquidated damages and carry.`
            : "No schedule slip is recorded against the captured baseline.",
        ],
      },
      {
        type: "control_table",
        title: "Cost & draws",
        columns: [
          { key: "item", label: "Item" },
          { key: "value", label: "Position" },
        ],
        groups: [{ label: funded ? "Captured cost facts" : "No cost facts captured", rows: costRows }],
      },
      {
        type: "control_table",
        title: "Schedule",
        columns: [
          { key: "item", label: "Item" },
          { key: "value", label: "Position" },
        ],
        groups: [
          { label: funded ? "Captured schedule facts" : "No schedule facts captured", rows: scheduleRows },
        ],
      },
      openFindings("Risks carried into next month", specs, scoring, stageNumber, 15),
      {
        type: "narrative",
        title: "Risks opened and retired",
        body: [
          `Retired this month: ${verifiedThisMonth.length} controls moved to Complete — Verified. ${verifiedThisMonth.slice(0, 8).map((c) => c.control_id).join(", ") || "None on the record."}`,
          `Still open: ${specs.filter((c) => isOpen(scoring, c.control_id)).length} applicable controls. A risk is retired only by verified evidence; nothing here is retired by the passage of time.`,
        ],
      },
      {
        type: "signature_block",
        title: "Issued to the board",
        statement:
          "This report reconciles the month against the project record at the revision stated. Withheld figures reflect inputs not captured, not figures that are zero.",
        signatories: ["Owner", "Board representative"],
      },
    ],
    citations: citationsFor(specs.filter((c) => isOpen(scoring, c.control_id)).slice(0, 30), scoring),
    confidence: scoring.composite?.confidence ?? 0,
    unresolvedInputs: unresolved,
  };
};

/* --------------------------------- generator 8 — closeout & turnover */

const closeoutGenerator: Generator = (ctx) => {
  const { scoring, stageNumber } = ctx;
  const meta = baseMeta(ctx, true);
  const unresolved: string[] = [];
  const specs = specsFor(scoring, stageNumber, [7, 8]);
  const cm = completeness(specs, scoring);
  const open = specs.filter((c) => isOpen(scoring, c.control_id));
  const criticalOpen = open.filter((c) => c.criticality === "CRITICAL");

  if (!specs.length)
    unresolved.push("No Stage 7 or Stage 8 controls are applicable under this project profile");
  if (criticalOpen.length)
    unresolved.push(
      `${criticalOpen.length} critical closeout controls are open — accepting turnover now transfers each of them to the owner's balance sheet`,
    );

  const position = criticalOpen.length
    ? `DO NOT ACCEPT TURNOVER YET. ${criticalOpen.length} critical closeout controls are open. Acceptance converts contractor obligations into owner cost.`
    : cm.pct >= 90
      ? `TURNOVER CAN BE ACCEPTED. ${cm.verified} of ${cm.applicable} closeout controls are verified (${cm.pct}%).`
      : `ACCEPT ONLY WITH A PUNCH AND RETENTION POSITION. Completeness is ${cm.pct}%.`;

  return {
    meta,
    sections: [
      {
        type: "narrative",
        title: "Turnover position",
        body: [
          `${ctx.project.name} — turnover readiness measured against the closeout control set, not against a certificate. A certificate closes a regulatory obligation; it does not close the underlying risk.`,
          `Basis: ${cm.applicable} applicable closeout controls, ${cm.verified} verified (${cm.pct}%).`,
          position,
        ],
      },
      controlTable("Closeout controls", specs, scoring, `${cm.applicable} applicable closeout controls`),
      exitCriteriaSection("Turnover gate", scoring),
      openFindings("Open items at turnover", specs, scoring, stageNumber, 25),
      {
        type: "signature_block",
        title: "Acceptance",
        statement: position,
        signatories: ["Owner", "Facilities"],
      },
    ],
    citations: citationsFor(specs, scoring),
    confidence: scoring.composite?.confidence ?? 0,
    unresolvedInputs: unresolved,
  };
};

/* -------------------------------- generator 9 — claim exposure & dispute */

const claimExposureGenerator: Generator = (ctx) => {
  const { scoring, stageNumber } = ctx;
  const meta = baseMeta(ctx, true);
  const unresolved: string[] = [];
  const specs = specsFor(scoring, stageNumber, STAGE_NUMBERS.filter((s) => s <= stageNumber));
  const { section: chrono, undated } = chronologySection(
    "What did we know and when",
    specs,
    scoring,
  );
  const uncited = specs.filter((c) => !scoring.instanceMap.get(c.control_id)?.evidence_ref?.trim());
  const open = specs.filter((c) => isOpen(scoring, c.control_id));

  if (undated)
    unresolved.push(
      `${undated} verified controls carry no verification date. A record without a date cannot establish what was knowable when, which is the question a tribunal asks first.`,
    );
  if (uncited.length)
    unresolved.push(
      `${uncited.length} of ${specs.length} controls have no locatable citation — those positions are not defensible as pleaded facts`,
    );

  return {
    meta,
    sections: [
      chrono,
      openFindings("Notices and reservations", open, scoring, stageNumber, 25),
      controlTable(
        "Controls bearing on the dispute",
        specs.slice(0, 200),
        scoring,
        `${specs.length} controls in scope up to Stage ${stageNumber}, ${uncited.length} without a citation`,
        [...CONTROL_COLUMNS, { key: "evidence_ref", label: "Citation" }],
      ),
      {
        type: "narrative",
        title: "State of the record",
        body: [
          `The record supporting ${ctx.project.name} runs to ${specs.length} controls through Stage ${stageNumber} · ${stageName(stageNumber)}. Of these, ${specs.length - uncited.length} carry a locatable citation and ${uncited.length} do not.`,
          "Chronology is built only from dated verification events. No date is inferred, and no event is placed on the timeline earlier than the date the record could first have shown it.",
          `${open.length} controls remain open. Each is a live exposure, not a historical one, and each carries the remedy that closes it above.`,
        ],
      },
      {
        type: "signature_block",
        title: "Counsel review",
        statement:
          "This report states the record as loaded. It is not a legal opinion and does not assert liability; it establishes what the record shows and when it showed it.",
        signatories: ["Counsel", "Insurer"],
      },
    ],
    citations: citationsFor(specs.slice(0, 60), scoring),
    confidence: scoring.composite?.confidence ?? 0,
    unresolvedInputs: unresolved,
  };
};

/* ------------------------------------------ generator 12 — the proposal */

const proposalGenerator: Generator = (ctx) => {
  const { scoring, stageNumber, project } = ctx;
  const meta = baseMeta(ctx, false);
  const unresolved: string[] = [];
  const specs = specsFor(scoring, stageNumber);
  const forward = scoring.register.filter((c) => c.stage_number >= stageNumber);
  const families = new Set(specs.map((c) => c.family_code));

  unresolved.push(
    "Fee figures are not stated by the engine. The fee basis below describes how a fee is constructed; the number is set by the engagement and entered on the engagement letter.",
  );

  return {
    meta,
    sections: [
      {
        type: "narrative",
        title: "What we would be engaged to do",
        body: [
          `ClaimZero would run the control register against ${project.name} — ${project.city} · ${project.type} · $${project.sizeM}M — from Stage ${stageNumber} · ${stageName(stageNumber)} through completion.`,
          "The work is evidence verification, not advice. Every control has a named responsible seat, a defined artefact that satisfies it, and a verification method a reviewer applies before it is allowed to count. Nothing is scored on assertion.",
          "You are buying two things: knowing what is open before it becomes a claim, and a record that holds up when someone later asks what was knowable and when.",
        ],
      },
      {
        type: "narrative",
        title: "Scope at this stage",
        body: [
          `${specs.length} controls are applicable at Stage ${stageNumber} under this project profile, across ${families.size} control families.`,
          `${forward.length} controls apply across the remaining stages of the project as it advances.`,
          "Controls that do not apply to this delivery model, asset class or jurisdiction are excluded by the applicability engine and are named as excluded rather than silently dropped.",
        ],
      },
      controlTable(
        "Applicable control families under the project profile",
        specs.slice(0, 60),
        scoring,
        specs.length > 60
          ? `First 60 of ${specs.length} applicable controls shown — the remaining ${specs.length - 60} are in scope and are not omitted from the engagement`
          : `${specs.length} applicable controls`,
        [
          { key: "control_id", label: "Control" },
          { key: "title", label: "Requirement" },
          { key: "responsible_seat", label: "Responsible seat" },
          { key: "evidence_class", label: "Evidence class" },
        ],
      ),
      {
        type: "narrative",
        title: "Cadence, deliverables and reviewer gate",
        body: [
          "Weekly: Weekly Development Intelligence — what matters this week, ranked, with the work that closes it.",
          "Monthly: End-of-Month Executive Report, Time & Money, and the Development Control Report Card.",
          "On demand: Stage Gate at every phase transition, and the Risk Mitigation Plan issued to the CM, design team and subcontractors.",
          "Every client-facing report passes a human reviewer before issue. A published report is frozen and hash-chained; revisions are issued, never edited.",
        ],
      },
      {
        type: "narrative",
        title: "Fee basis",
        body: [
          "Fee is constructed from applicable control mass and reviewer days, not from project value. A larger project only costs more where it carries more controls or more evidence to verify.",
          `On this profile: ${specs.length} controls in scope now, ${forward.length} across the remaining programme.`,
          "The fee figure is stated on the engagement letter. No figure is invented here.",
        ],
      },
      {
        type: "signature_block",
        title: "Acceptance",
        statement:
          "Acceptance of this proposal authorises intake and provisioning. It does not commence the engagement — the engagement letter does.",
        signatories: ["Owner / Principal", "ClaimZero"],
      },
    ],
    citations: [],
    confidence: scoring.composite?.confidence ?? 0,
    unresolvedInputs: unresolved,
  };
};

/* --------------------------------- generator 13 — the engagement letter */

const engagementLetterGenerator: Generator = (ctx) => {
  const { scoring, stageNumber, project } = ctx;
  const meta = baseMeta(ctx, true);
  const specs = specsFor(scoring, stageNumber);
  return {
    meta,
    sections: [
      {
        type: "narrative",
        title: "Parties and project",
        body: [
          `This letter is between the Client and ClaimZero in respect of ${project.name}, ${project.city} — ${project.type}, $${project.sizeM}M, at Stage ${stageNumber} · ${stageName(stageNumber)} on the date of execution.`,
          "Execution opens intake and starts the Day 0 clock. Intake is complete when the project profile is entered, the register is instantiated and the client's named seats hold provisioned accounts.",
        ],
      },
      {
        type: "narrative",
        title: "Services and deliverables",
        body: [
          `ClaimZero will instantiate and maintain the control register for this project — ${specs.length} controls applicable at the current stage — and verify evidence against it.`,
          "Deliverables: Weekly Development Intelligence; End-of-Month Executive Report; Time & Money; Development Control Report Card; Stage Gate at each phase transition; and the Risk Mitigation Plan issued to third parties.",
          "Every client-facing report is reviewed by a named ClaimZero reviewer before issue. Published reports are frozen and hash-chained.",
        ],
      },
      {
        type: "narrative",
        title: "Information the client must supply",
        body: [
          "Named seats for each control, held by individuals and not shared mailboxes.",
          "Access to the project record: contracts, schedules in native format, cost reports, correspondence, approvals and their conditions.",
          "Budget and schedule facts — contract sum, contingency, committed equity and debt, baseline and forecast completion, and loan maturity. Where these are not supplied, the reports withhold the figures rather than estimating them.",
          "Timely response to escalations. A control cannot be closed by ClaimZero on the client's behalf.",
        ],
      },
      {
        type: "narrative",
        title: "Limitations — what this engagement is not",
        body: [
          "This is not legal advice, not design review, not a cost estimate and not a schedule forecast. ClaimZero verifies evidence against controls; it does not warrant the underlying work.",
          "ClaimZero reports what the loaded record shows. Where the record is silent, the silence is reported as a gap. Absence of a finding is not a finding of absence.",
          "No dollar value and no delay day is asserted without a verified basis in the record.",
        ],
      },
      {
        type: "signature_block",
        title: "Execution",
        statement:
          "Executed by the parties below. The Day 0 clock starts on the later of the two execution dates.",
        signatories: ["Client", "ClaimZero"],
      },
    ],
    citations: [],
    confidence: scoring.composite?.confidence ?? 0,
    unresolvedInputs: [
      "Commercial terms — fee, term and notice period — are set by the engagement and are not generated by the platform.",
    ],
  };
};

/* --------------------------------- generator 14 — the operator manual */

const operatorManualGenerator: Generator = (ctx) => {
  const meta = baseMeta(ctx, true);
  return {
    meta,
    sections: [
      {
        type: "narrative",
        title: "Doctrine — null is not zero",
        body: [
          "Null is not zero. Missing is not stable. Unknown is not green. A control with no evidence is EVIDENCE_NOT_LOCATED, and it is never scored as satisfied.",
          "Regulatory closure is not causal closure. A closed RFI, a signed certificate or a released permit closes a process; it does not close the underlying risk.",
          "Future evidence cannot enter an earlier historical playback. Playback filters on when a fact became knowable, never on when it occurred.",
          "No invented dollar values. No invented delay days. Where the basis is not in the record, the figure is withheld and the withholding is itself reported.",
          "No finding without a remedy. Every failing line carries the work, the seat, the cost and the date. A mark without a remedy is a complaint, not intelligence.",
          "No silent caps. Where a view is truncated — a top ten, a sample, a weekly budget — the report states what was held back.",
        ],
      },
      {
        type: "narrative",
        title: "The queue, the session and the weekly budget",
        body: [
          "Work reaches an operator through the reviewer queue. Items are ranked by severity, irreversibility and age; they are never dequeued by time alone.",
          "A session is opened before work begins and closed when it ends. Items worked and minutes spent are recorded against the session — that is how reviewer capacity is measured and forecast.",
          "The weekly budget bounds how much a reviewer is asked to carry. When the budget bounds the queue, the shortfall is reported to the owner, not absorbed silently.",
        ],
      },
      {
        type: "narrative",
        title: "The reviewer gate and the four approval levels",
        body: [
          "A control moves to Complete — Verified only when a reviewer has applied the verification method stated in the control row. Self-certification by the responsible seat does not close a control.",
          "Draft — generated from the record, not yet reviewed. In review — a named reviewer holds it. Approved — the reviewer accepts the findings and remedies. Published — frozen, hash-chained and issued; never edited, only superseded by a new revision.",
          "Any operator may generate. Only a reviewer may approve. Publishing requires an approved revision.",
        ],
      },
      {
        type: "narrative",
        title: "Escalation and SLA",
        body: [
          "Escalation rules are configuration, not code. Each rule states its conditions, its severity floor, the action it forces and the false-positive checks the operator must run before it is acted on.",
          "A fired escalation is answered within 24 hours on a critical or irreversible control, and within five working days otherwise.",
          "Failure to provision, upload on cadence or answer an escalation is recorded against the responsible seat and is reportable to the owner.",
        ],
      },
      {
        type: "signature_block",
        title: "Read and understood",
        statement:
          "The operator confirms they have read this manual and accept the doctrine, the reviewer gate and the escalation SLA as binding on their work.",
        signatories: ["Operator", "ClaimZero reviewer"],
      },
    ],
    citations: [],
    confidence: 100,
    unresolvedInputs: [],
  };
};

/* --------------------------------------------------------- generator map */


export const GENERATORS: Record<string, Generator> = {
  DUE_DILIGENCE_FEASIBILITY: dueDiligenceGenerator,
  ENTITLEMENT_CONDITIONS: entitlementGenerator,
  PROJECT_ASSESSMENT_FINANCING: financingGenerator,
  RISK_MITIGATION_PLAN: rmpGenerator,
  WEEKLY_INTELLIGENCE: weeklyGenerator,
  MONTHLY_EXECUTIVE: monthlyGenerator,
  STAGE_GATE: stageGateGenerator,
  CLOSEOUT_TURNOVER: closeoutGenerator,
  CLAIM_EXPOSURE: claimExposureGenerator,
  TIME_AND_MONEY: timeMoneyGenerator,
  DEVELOPMENT_CONTROL_REPORT_CARD: reportCardGenerator,
  PROPOSAL: proposalGenerator,
  ENGAGEMENT_LETTER: engagementLetterGenerator,
  OPERATOR_MANUAL: operatorManualGenerator,
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
