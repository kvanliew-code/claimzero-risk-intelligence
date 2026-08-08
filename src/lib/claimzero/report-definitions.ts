// ClaimZero — authored report definitions, seed-ready for REQ-010.
//
// This file is DATA, not a migration. Lovable owns `supabase/migrations/`; this
// module is the authored source of truth that a Lovable seed writes into
// `public.report_definitions`. Nothing here touches the database at runtime —
// the app still reads definitions with `fetchReportDefinitions()`.
//
// Two invariants are enforced by tests (see __tests__/report-definitions.test.ts):
//   1. every key in `GENERATORS` has exactly one definition here;
//   2. every `sections[].type` is a member of `SECTION_TYPES`.
//
// Note of record: CLAIMZERO_OPERATING_BRIEF.md §14.2 says "all twelve
// definitions". The live table carries eleven report types, and §7.1 / REQ-010
// require `PROPOSAL`, `ENGAGEMENT_LETTER` and `OPERATOR_MANUAL` as well — which
// is fourteen, not twelve. The eleven stored rows are reproduced verbatim rather
// than pruned to reach a number; the count discrepancy is logged in
// docs/SCHEMA_REQUESTS.md under REQ-010 for Ken to settle. Guessing which three
// to drop would delete published methodology.

import type { ReportDefinition } from "./reports";

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    report_key: "DUE_DILIGENCE_FEASIBILITY",
    title: "Due Diligence & Feasibility",
    audience: "Principal and equity",
    decision: "Should the owner pursue, acquire, reprice, condition or walk away?",
    applicable_stages: [1],
    cadence: "ON_DEMAND",
    active: true,
    sort_order: 1,
    sections: [
      { type: "narrative", title: "Feasibility position", config: { source: "stage_summary" } },
      {
        type: "control_table",
        title: "Diligence controls",
        config: {
          stages: [1],
          columns: ["control_id", "title", "responsible_seat", "evidence_class", "status"],
        },
      },
      {
        type: "finding_list",
        title: "Deal-breakers and conditions",
        config: { severity: ["CRITICAL", "SEVERE"] },
      },
      { type: "exit_criteria_status", title: "Close readiness", config: { stage: 1 } },
      {
        type: "signature_block",
        title: "Recommendation",
        config: { signatories: ["Principal", "Equity"] },
      },
    ],
  },
  {
    report_key: "ENTITLEMENT_CONDITIONS",
    title: "Entitlement Risk & Conditions",
    audience: "Principal and land-use counsel",
    decision: "What must occur to preserve approvals?",
    applicable_stages: [2],
    cadence: "ON_DEMAND",
    active: true,
    sort_order: 2,
    sections: [
      { type: "narrative", title: "Entitlement position", config: { source: "stage_summary" } },
      {
        type: "chronology",
        title: "Conditions of approval register",
        config: { dated: true, owner_required: true },
      },
      { type: "control_table", title: "Entitlement controls", config: { stages: [2] } },
      { type: "exit_criteria_status", title: "Entitlement gate", config: { stage: 2 } },
      {
        type: "signature_block",
        title: "Acknowledgment",
        config: { signatories: ["Principal", "Land-use counsel"] },
      },
    ],
  },
  {
    report_key: "PROJECT_ASSESSMENT_FINANCING",
    title: "Project Assessment for Financing",
    audience: "Lender credit committee",
    decision: "Is this project ready to finance and proceed?",
    applicable_stages: [3, 4, 5],
    cadence: "ON_DEMAND",
    active: true,
    sort_order: 3,
    sections: [
      {
        type: "aspect_summary",
        title: "Composite index and confidence band",
        config: { weighted: ["A07", "A08", "A09", "A10", "A11"], require_citations: true },
      },
      { type: "control_table", title: "Evidence base", config: { require_citations: true } },
      { type: "finding_list", title: "Credit conditions", config: {} },
      { type: "exit_criteria_status", title: "Financing gate", config: { stage: 4 } },
      {
        type: "signature_block",
        title: "Credit committee",
        config: { signatories: ["Credit officer"] },
      },
    ],
  },
  {
    report_key: "RISK_MITIGATION_PLAN",
    title: "Project Risk Mitigation & Participation Plan",
    audience: "CM, design team and every subcontractor",
    decision: "How do we all work?",
    applicable_stages: [4, 5, 6],
    cadence: "ON_DEMAND",
    active: true,
    sort_order: 4,
    sections: [
      { type: "narrative", title: "Purpose and scope", config: { controlled_document: true } },
      { type: "aspect_summary", title: "Aspect position at issue", config: {} },
      {
        type: "control_table",
        title: "Required controls by aspect",
        config: {
          columns: [
            "control_id",
            "title",
            "responsible_seat",
            "evidence_class",
            "verification_method",
            "mitigation_template",
          ],
          group_by: "aspect",
        },
      },
      {
        type: "finding_list",
        title: "Escalation triggers and consequences",
        config: { source: "escalation_rules" },
      },
      {
        type: "narrative",
        title: "Platform participation",
        config: { source: "platform_participation" },
      },
      {
        type: "signature_block",
        title: "Acknowledgment of receipt",
        config: {
          signatories: ["Construction Manager", "Design team lead", "Subcontractor representative"],
        },
      },
    ],
  },
  {
    report_key: "WEEKLY_INTELLIGENCE",
    title: "Weekly Development Intelligence",
    audience: "Owner",
    decision: "What matters this week?",
    applicable_stages: [6],
    cadence: "WEEKLY",
    active: true,
    sort_order: 5,
    sections: [
      { type: "aspect_summary", title: "Project Risk Index", config: {} },
      { type: "control_table", title: "The Top Ten", config: { limit: 10 } },
      { type: "narrative", title: "Commentary", config: {} },
    ],
  },
  {
    report_key: "MONTHLY_EXECUTIVE",
    title: "End-of-Month Executive Report",
    audience: "Owner and board",
    decision: "How did the month reconcile?",
    applicable_stages: [6],
    cadence: "MONTHLY",
    active: true,
    sort_order: 6,
    sections: [
      { type: "narrative", title: "The month in one paragraph", config: {} },
      { type: "control_table", title: "Cost & draws", config: {} },
      { type: "control_table", title: "Schedule", config: {} },
      { type: "narrative", title: "Risks opened and retired", config: {} },
    ],
  },
  {
    report_key: "STAGE_GATE",
    title: "Stage Gate / Phase Transition",
    audience: "Owner, lender and CM",
    decision: "Are we actually ready to advance?",
    applicable_stages: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    cadence: "ON_DEMAND",
    active: true,
    sort_order: 7,
    sections: [
      { type: "narrative", title: "Gate verdict", config: {} },
      {
        type: "exit_criteria_status",
        title: "Exit criteria — hard and soft",
        config: { split_blocking: true },
      },
      {
        type: "control_table",
        title: "Critical open controls",
        config: { filter: "critical_open" },
      },
      {
        type: "finding_list",
        title: "Critical and irreversible open",
        config: { filter: "critical_irreversible" },
      },
      {
        type: "signature_block",
        title: "Gate decision",
        config: { signatories: ["Owner", "Lender", "Construction Manager"] },
      },
    ],
  },
  {
    report_key: "CLOSEOUT_TURNOVER",
    title: "Closeout & Turnover Readiness",
    audience: "Owner, property manager and insurer",
    decision: "Should the owner accept turnover?",
    applicable_stages: [7, 8],
    cadence: "ON_DEMAND",
    active: true,
    sort_order: 8,
    sections: [
      { type: "narrative", title: "Turnover position", config: {} },
      { type: "control_table", title: "Closeout controls", config: { stages: [6] } },
      { type: "exit_criteria_status", title: "Turnover gate", config: { stage: 6 } },
      { type: "finding_list", title: "Open items at turnover", config: {} },
      {
        type: "signature_block",
        title: "Acceptance",
        config: { signatories: ["Owner", "Facilities"] },
      },
    ],
  },
  {
    report_key: "CLAIM_EXPOSURE",
    title: "Claim Exposure & Dispute Readiness",
    audience: "Counsel, insurer and expert",
    decision: "What happened, what was knowable, what exposure remains?",
    applicable_stages: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    cadence: "ON_DEMAND",
    active: true,
    sort_order: 9,
    sections: [
      { type: "chronology", title: "What did we know and when", config: { dated: true } },
      { type: "finding_list", title: "Notices and reservations", config: {} },
      {
        type: "control_table",
        title: "Controls bearing on the dispute",
        config: { require_citations: true },
      },
      { type: "narrative", title: "State of the record", config: {} },
      {
        type: "signature_block",
        title: "Counsel review",
        config: { signatories: ["Counsel", "Insurer"] },
      },
    ],
  },
  {
    report_key: "TIME_AND_MONEY",
    title: "Time & Money — Cost and Schedule Report Card",
    audience: "Ownership, equity partners, family offices and lender",
    decision:
      "Will this cost more or take longer than we underwrote, and is a capital call indicated?",
    applicable_stages: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    cadence: "MONTHLY",
    active: true,
    sort_order: 10,
    sections: [
      { type: "narrative", title: "What this report answers", config: {} },
      {
        type: "metric_grid",
        title: "Time and money position",
        config: { withhold_uncaptured: true },
      },
      {
        type: "grade_card",
        title: "Phase report card",
        config: { grade_by: "verified_over_applicable" },
      },
      { type: "aspect_summary", title: "Where the exposure sits by aspect", config: {} },
      {
        type: "finding_list",
        title: "Open items with a cost or schedule consequence",
        config: { severity: ["CRITICAL", "HIGH"] },
      },
      { type: "narrative", title: "Capital call position", config: {} },
      {
        type: "signature_block",
        title: "Issued to partners",
        config: {
          signatories: ["Sponsor / Managing member", "Equity partner representative", "Lender"],
        },
      },
    ],
  },
  {
    report_key: "DEVELOPMENT_CONTROL_REPORT_CARD",
    title: "Development Control Report Card",
    audience: "Owner, sponsor, equity partners and lender",
    decision:
      "Whether the development is under control at this stage, subject by subject, and what specific work raises the grade",
    applicable_stages: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    cadence: "MONTHLY",
    active: true,
    sort_order: 11,
    sections: [
      { type: "narrative", title: "How to read this report card", config: {} },
      {
        type: "transcript",
        title: "Subject grades",
        config: { scale: "standard", gpaScale: 4.0, passMark: 80 },
      },
      {
        type: "finding_list",
        title: "Subjects below the pass mark — required work",
        config: { remedyRequired: true },
      },
      { type: "signature_block", title: "Issued to the ownership group", config: {} },
    ],
  },

  /* ---------------------------------------------------------------------
     The commercial spine (§7.1) and the operator manual (§10). Generators are
     implemented for all fourteen definitions, so every row is active. An
     active definition without a generator would render an empty report — the
     coverage test in __tests__/report-definitions.test.ts blocks that.
     --------------------------------------------------------------------- */
  {
    report_key: "PROPOSAL",
    title: "Proposal",
    audience: "Prospective client — principal and decision-maker",
    decision: "Should the owner engage ClaimZero, at what engagement level, and for how long?",
    applicable_stages: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    cadence: "ON_DEMAND",
    active: true,
    sort_order: 12,
    sections: [
      { type: "narrative", title: "What we would be engaged to do", config: {} },
      { type: "narrative", title: "Scope at this stage", config: { source: "stage_summary" } },
      {
        type: "control_table",
        title: "Applicable control families under the project profile",
        config: { columns: ["control_id", "title", "responsible_seat", "evidence_class"] },
      },
      { type: "narrative", title: "Cadence, deliverables and reviewer gate", config: {} },
      { type: "narrative", title: "Fee basis", config: {} },
      {
        type: "signature_block",
        title: "Acceptance",
        config: { signatories: ["Owner / Principal", "ClaimZero"] },
      },
    ],
  },
  {
    report_key: "ENGAGEMENT_LETTER",
    title: "Engagement Letter",
    audience: "Client principal and counsel",
    decision: "Executing this letter opens intake and starts the Day 0 clock.",
    applicable_stages: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    cadence: "ON_DEMAND",
    active: true,
    sort_order: 13,
    sections: [
      { type: "narrative", title: "Parties and project", config: {} },
      { type: "narrative", title: "Services and deliverables", config: {} },
      { type: "narrative", title: "Information the client must supply", config: {} },
      { type: "narrative", title: "Limitations — what this engagement is not", config: {} },
      {
        type: "signature_block",
        title: "Execution",
        config: { signatories: ["Client", "ClaimZero"] },
      },
    ],
  },
  {
    report_key: "OPERATOR_MANUAL",
    title: "Operator Manual",
    audience: "ClaimZero staff — reviewers, project managers and executives",
    decision: "How the platform is operated, and what an operator is accountable for.",
    applicable_stages: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    cadence: "ON_DEMAND",
    active: true,
    sort_order: 14,
    sections: [
      { type: "narrative", title: "Doctrine — null is not zero", config: {} },
      { type: "narrative", title: "The queue, the session and the weekly budget", config: {} },
      { type: "narrative", title: "The reviewer gate and the four approval levels", config: {} },
      { type: "narrative", title: "Escalation and SLA", config: {} },
      { type: "signature_block", title: "Read and understood", config: {} },
    ],
  },
];

/** Lookup by report key. */
export const REPORT_DEFINITION_BY_KEY: Record<string, ReportDefinition> = Object.fromEntries(
  REPORT_DEFINITIONS.map((d) => [d.report_key, d]),
);
