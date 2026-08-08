// ClaimZero — the demo project seed.
//
// Harbor Point Residences is synthetic and explicitly labelled as such. Every
// figure, document excerpt and finding here is composite and illustrative; it
// is not traceable to any real project, party or engagement.

import type { ControlStatus } from "./controls";

export const DEMO_PROJECT_ID = 0;

export const isDemoProject = (id: number) => id === DEMO_PROJECT_ID;

export const DEMO_IDENTITY = {
  name: "Harbor Point Residences",
  type: "312-unit mixed-use rental — 18 storeys, ground-floor retail",
  city: "Jersey City, NJ",
  sizeM: 184,
  tier: "B — institutional",
  delivery: "FAST_TRACK / bifurcated",
  stage: "Construction",
  stageNote: "Stage 5 — Construction, month 14 of 26",
  synthetic: "SYNTHETIC DEMONSTRATION RECORD — composite patterns only",
} as const;

/** §Part Three — the deliberate imperfection. Six of twenty-two are outstanding. */
export interface RequiredInput {
  name: string;
  owed: string;
  status: "received" | "outstanding";
  control_id?: string;
  daysOutstanding?: number;
}

export const DEMO_REQUIRED_INPUTS: RequiredInput[] = [
  { name: "Adopted approval resolution + conditions", owed: "Counsel", status: "received" },
  {
    name: "Condition compliance register (dated, named owner)",
    owed: "Owner",
    status: "outstanding",
    control_id: "PAV-CND-002",
    daysOutstanding: 34,
  },
  {
    name: "Approval validity / extension filings",
    owed: "Counsel",
    status: "outstanding",
    control_id: "PAV-CND-003",
    daysOutstanding: 34,
  },
  { name: "Executed loan agreement", owed: "Owner", status: "received" },
  { name: "Interest reserve schedule", owed: "Owner", status: "received" },
  {
    name: "Owner requisition reconciliation (July)",
    owed: "Owner",
    status: "outstanding",
    control_id: "CON-PAY-003",
    daysOutstanding: 22,
  },
  {
    name: "Lien & docket search — major trades",
    owed: "Counsel",
    status: "outstanding",
    control_id: "CON-SUB-002",
    daysOutstanding: 47,
  },
  {
    name: "Permanent power service agreement",
    owed: "Owner",
    status: "outstanding",
    control_id: "CON-UTL-002",
    daysOutstanding: 61,
  },
  {
    name: "Written utility capacity confirmation",
    owed: "Architect",
    status: "outstanding",
    control_id: "DES-UTL-001",
    daysOutstanding: 88,
  },
  { name: "GMP contract and exhibits", owed: "CM", status: "received" },
  { name: "Baseline CPM schedule (accepted)", owed: "CM", status: "received" },
  { name: "Monthly schedule update — July", owed: "CM", status: "received" },
  { name: "Long-lead procurement log", owed: "CM", status: "received" },
  { name: "Buyout log and trade contracts", owed: "CM", status: "received" },
  { name: "Change order log", owed: "CM", status: "received" },
  { name: "Anticipated cost report", owed: "CM", status: "received" },
  { name: "Contingency drawdown ledger", owed: "CM", status: "received" },
  { name: "RFI and submittal logs", owed: "CM", status: "received" },
  { name: "Manpower / daily reports", owed: "CM", status: "received" },
  { name: "Special inspection statement + sign-offs", owed: "CM", status: "received" },
  { name: "Builder's risk and liability certificates", owed: "Owner", status: "received" },
  { name: "Owner-furnished item delivery log", owed: "Owner", status: "received" },
];

export const DEMO_INPUTS_OUTSTANDING = DEMO_REQUIRED_INPUTS.filter(
  (i) => i.status === "outstanding",
).length;
export const DEMO_INPUTS_TOTAL = DEMO_REQUIRED_INPUTS.length;
/** 16 of 22 on file → 73% → LIMITED. The banner never rounds up. */
export const DEMO_CONFIDENCE = Math.round(
  (100 * (DEMO_INPUTS_TOTAL - DEMO_INPUTS_OUTSTANDING)) / DEMO_INPUTS_TOTAL,
);

/** Source evidence behind a finding — the drawer content. */
export interface SourceExcerpt {
  document: string;
  page: string;
  adopted: string;
  sourceClass:
    | "CONTEMPORANEOUS_PROJECT_RECORD"
    | "CONTRACT_DOCUMENT"
    | "THIRD_PARTY_RECORD"
    | "DERIVED_ANALYSIS";
  confidence: "FULL" | "LIMITED" | "INSUFFICIENT";
  /** Lines of the excerpt; the one marked highlight is the operative sentence. */
  lines: { text: string; highlight?: boolean }[];
}

export interface DemoFinding {
  id: string;
  rule: string;
  control_id: string;
  aspect_id: string;
  aspect_name: string;
  headline: string;
  detail: string;
  detected: string;
  severity: "CRITICAL" | "SERIOUS" | "WATCH";
  status: ControlStatus;
  criticality: string;
  irreversibility: string;
  source: SourceExcerpt;
}

export const DEMO_FINDINGS: DemoFinding[] = [
  {
    id: "F1",
    rule: "CZ-RULE-ENT-001",
    control_id: "PAV-CND-002",
    aspect_id: "A03",
    aspect_name: "Entitlement & Development Rights",
    headline:
      "Approval Condition 7 — traffic signal warrant study — expires in 61 days. No extension on file.",
    detail: "$4.2M committed to site work since approval.",
    detected: "Detected from the adopted resolution, page 9. Confidence: FULL.",
    severity: "CRITICAL",
    status: "EVIDENCE_NOT_LOCATED",
    criticality: "CRITICAL",
    irreversibility: "VERY_HIGH",
    source: {
      document: "Planning Board Resolution 2024-118 — Harbor Point Residences (synthetic)",
      page: "Page 9 of 14 — Conditions of Approval",
      adopted: "Adopted 14 October 2024",
      sourceClass: "CONTEMPORANEOUS_PROJECT_RECORD",
      confidence: "FULL",
      lines: [
        {
          text: "6.  The applicant shall dedicate the 12-foot sidewalk easement along Harbor Way prior to issuance of any foundation permit.",
        },
        {
          text: "7.  The applicant shall complete a traffic signal warrant study for the Harbor Way / Third Street intersection, and shall install any warranted signalization, within twenty-four (24) months of the date of this resolution. Failure to satisfy this condition within the stated period shall render the site plan approval void unless an extension is granted by the Board upon written application filed prior to expiration.",
          highlight: true,
        },
        {
          text: "8.  All off-site drainage improvements shall be bonded in an amount approved by the Township Engineer.",
        },
      ],
    },
  },
  {
    id: "F2",
    rule: "CZ-RULE-SCH-001",
    control_id: "CON-SCH-001",
    aspect_id: "A24",
    aspect_name: "Schedule Integrity & Critical Path",
    headline:
      "Independent delay position diverges 24 days from the CM's update, which holds the completion date.",
    detail:
      "14 RFIs aged past the contract response period · 3 submittals not returned · manpower 22% under the curve for six weeks.",
    detected: "Derived from RFI, submittal and manpower records. Confidence: FULL.",
    severity: "CRITICAL",
    status: "ADVERSE",
    criticality: "CRITICAL",
    irreversibility: "HIGH",
    source: {
      document: "Schedule Update No. 14 — narrative (synthetic)",
      page: "Page 2 — Critical path statement",
      adopted: "Issued 28 July 2026",
      sourceClass: "CONTEMPORANEOUS_PROJECT_RECORD",
      confidence: "FULL",
      lines: [
        {
          text: "The project remains on schedule for substantial completion on 12 June 2027. No time extension is requested in this update.",
        },
        {
          text: "Level 7–12 interior rough-in durations have been compressed from 34 to 21 working days to hold the milestone; no added manpower or shift is identified in support.",
          highlight: true,
        },
        {
          text: "Curtain wall installation start remains as previously reported notwithstanding outstanding submittal 08-4400-003.",
        },
      ],
    },
  },
  {
    id: "F3",
    rule: "CZ-RULE-SCH-004",
    control_id: "CON-PRC-001",
    aspect_id: "A21",
    aspect_name: "Procurement, Buyout & Long Lead",
    headline: "Switchgear release date passed 11 days ago. No purchase order issued.",
    detail:
      "The activity sits on the critical path; 38-week lead time against a 34-week float position.",
    detected: "Derived from the long-lead log and the accepted baseline. Confidence: FULL.",
    severity: "CRITICAL",
    status: "ADVERSE",
    criticality: "CRITICAL",
    irreversibility: "HIGH",
    source: {
      document: "Long-Lead Procurement Log — rev 9 (synthetic)",
      page: "Row 14 — Electrical distribution",
      adopted: "Updated 26 July 2026",
      sourceClass: "CONTEMPORANEOUS_PROJECT_RECORD",
      confidence: "FULL",
      lines: [
        {
          text: "Item 13 — Elevator machines · released 04 Mar 2026 · delivery confirmed 19 Nov 2026.",
        },
        {
          text: "Item 14 — Main switchgear (3,000A) · release-by date 26 Jul 2026 · PO status: NOT ISSUED · quoted lead time 38 weeks · need date 12 Apr 2027.",
          highlight: true,
        },
        { text: "Item 15 — Generator · released 11 Jun 2026 · delivery confirmed 02 Feb 2027." },
      ],
    },
  },
  {
    id: "F4",
    rule: "CZ-RULE-CST-002",
    control_id: "CON-CST-002",
    aspect_id: "A16",
    aspect_name: "Cost Position & Contingency",
    headline: "61% of construction contingency consumed at 44% complete.",
    detail:
      "Burn is running 17 points ahead of progress; at the current rate contingency is exhausted at 71% complete.",
    detected:
      "Derived from the contingency ledger against the schedule of values. Confidence: FULL.",
    severity: "SERIOUS",
    status: "ADVERSE",
    criticality: "CRITICAL",
    irreversibility: "HIGH",
    source: {
      document: "Anticipated Cost Report — July 2026 (synthetic)",
      page: "Page 4 — Contingency ledger",
      adopted: "Issued 31 July 2026",
      sourceClass: "CONTEMPORANEOUS_PROJECT_RECORD",
      confidence: "FULL",
      lines: [
        { text: "Construction contingency, original: $7,360,000." },
        {
          text: "Drawn to date: $4,489,600 (61.0%). Work in place per the July requisition: 44.2%.",
          highlight: true,
        },
        {
          text: "Remaining contingency: $2,870,400. No reforecast of the remaining exposure is included in this report.",
        },
      ],
    },
  },
  {
    id: "F5",
    rule: "CZ-RULE-UTL-001",
    control_id: "CON-UTL-002",
    aspect_id: "A05",
    aspect_name: "Utilities, Access & Offsite",
    headline: "Permanent power assumed, never contracted. Energization needed in 240 days.",
    detail:
      "No executed service agreement, no written capacity confirmation, no queue position on file.",
    detected: "Evidence not located in the project record. Confidence: LIMITED.",
    severity: "SERIOUS",
    status: "EVIDENCE_NOT_LOCATED",
    criticality: "CRITICAL",
    irreversibility: "VERY_HIGH",
    source: {
      document: "Utility coordination correspondence (synthetic)",
      page: "Email thread — 3 items, most recent 08 May 2026",
      adopted: "Last entry 08 May 2026",
      sourceClass: "CONTEMPORANEOUS_PROJECT_RECORD",
      confidence: "LIMITED",
      lines: [
        {
          text: '"Capacity should not be an issue at this location — we\'ll get you into the queue once the load letter is final."',
        },
        {
          text: "No executed service agreement, capacity confirmation letter or queue position document is present in the record. Energization need date: 02 April 2027.",
          highlight: true,
        },
        {
          text: "ClaimZero does not infer availability from a verbal representation. Status is EVIDENCE_NOT_LOCATED, not satisfied.",
        },
      ],
    },
  },
];

/** §1:40 — the independent delay position against the CM's reported position. */
export const DIVERGENCE = {
  cmLabel: "CM schedule update — reported",
  czLabel: "ClaimZero independent position",
  completion: "12 June 2027",
  weeks: 11,
  series: [
    { period: "Feb", cm: 0, cz: 2 },
    { period: "Mar", cm: 0, cz: 5 },
    { period: "Apr", cm: 0, cz: 9 },
    { period: "May", cm: 0, cz: 13 },
    { period: "Jun", cm: 0, cz: 18 },
    { period: "Jul", cm: 0, cz: 24 },
  ],
  signals: [
    ["RFIs aged past the contract response period", "14"],
    ["Submittals not returned", "3"],
    ["Manpower against the loaded curve, six weeks", "−22%"],
    ["Compressed durations holding the completion date", "2 scopes"],
  ] as [string, string][],
};

/** §2:20 — dollars and days, not a risk score. */
export const EXPOSURE = {
  carryPerDay: 41_300,
  daysExposed: 24,
  total: 991_200,
  feeLine: "Our annual fee on this project: 11 days of carry.",
};

/** Statuses planted on the demo project. Everything else is generated. */
export const PLANTED_STATUS: Record<string, ControlStatus> = {
  // 1 — approval condition expiring during a stall
  "PAV-CND-002": "EVIDENCE_NOT_LOCATED",
  "PAV-CND-003": "EVIDENCE_NOT_LOCATED",
  // 2 — independent delay position diverging
  "CON-SCH-001": "ADVERSE",
  "CON-SCH-002": "ADVERSE",
  "CON-SCH-005": "IN_PROGRESS",
  "CON-RFI-001": "OVERDUE",
  "CON-RFI-002": "IN_PROGRESS",
  // 3 — long-lead order date passed silently
  "CON-PRC-001": "ADVERSE",
  "CON-PRC-003": "IN_PROGRESS",
  // 4 — contingency burning ahead of the work
  "CON-CST-002": "ADVERSE",
  // 5 — permanent power assumed, never contracted
  "CON-UTL-002": "EVIDENCE_NOT_LOCATED",
  "DES-UTL-001": "EVIDENCE_NOT_LOCATED",
  // deliberate imperfection — the remaining two of six not located
  "CON-PAY-003": "EVIDENCE_NOT_LOCATED",
  "CON-SUB-002": "EVIDENCE_NOT_LOCATED",
  // asserted complete, never independently verified
  "CON-QAL-002": "COMPLETE_UNVERIFIED",
  "CON-OWN-002": "COMPLETE_UNVERIFIED",
};

export const findingFor = (controlId: string): DemoFinding | undefined =>
  DEMO_FINDINGS.find((f) => f.control_id === controlId);

/**
 * Demo status generator. Deterministic, tuned so the demo project reads as a
 * live stage-5 record — closed-out early stages, live current stage, and the
 * planted findings above sitting on top.
 */
export function demoStatus(controlId: string, stageNumber: number, current: number): ControlStatus {
  const planted = PLANTED_STATUS[controlId];
  if (planted) return planted;
  let h = 2654435761;
  for (const ch of controlId) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  const r = (h % 1000) / 1000;
  const behind = current - stageNumber;
  const verifiedTo =
    behind >= 3 ? 0.63 : behind === 2 ? 0.62 : behind === 1 ? 0.54 : behind === 0 ? 0.17 : 0.4;
  if (r < verifiedTo) return "COMPLETE_VERIFIED";
  const t = (r - verifiedTo) / (1 - verifiedTo);
  if (t < 0.18) return "COMPLETE_UNVERIFIED";
  if (t < 0.62) return "IN_PROGRESS";
  if (t < 0.9) return "NOT_STARTED";
  return "BLOCKED";
}
