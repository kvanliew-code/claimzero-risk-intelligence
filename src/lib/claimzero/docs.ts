// ClaimZero — stage-aware expected-document register.
// Synthetic and deterministic: the same project always produces the same register.

import { projects, type Project } from "./data";
import { STAGE_OPTIONS, stageNumberOf, type StageName } from "./stages";

/**
 * The document register runs on the same nine stages as the control engine.
 * Stages with no expected documents of their own simply carry none — an empty
 * column is honest, an invented one is not.
 */
export const LIFECYCLE = STAGE_OPTIONS;

export type Lifecycle = StageName;

export type OwedBy = "Owner" | "Architect" | "CM" | "Counsel";
export type DocStatus = "received" | "outstanding" | "not-yet-applicable";
export type DocSource = "Owner upload" | "Egnyte" | "Procore" | "Autodesk";

export interface DocSpec {
  stage: Lifecycle;
  category: string;
  name: string;
  owedBy: OwedBy;
  optional?: boolean;
  recurring?: boolean;
}

export interface DocItem extends DocSpec {
  key: string;
  required: boolean;
  status: DocStatus;
  requestedOn: string | null;
  receivedOn: string | null;
  daysOutstanding: number;
  source: DocSource | null;
  indexed: boolean;
}

/**
 * How far along the nine stages this project is. Documents belonging to a later
 * stage are "not yet applicable" rather than outstanding — we never hold an
 * Owner to a deliverable their project has not reached.
 */
const stageCutFor = (project: Project) => stageNumberOf(project.stage) - 1;


export const REGISTER: DocSpec[] = [
  // ---- Acquisition (upfront owner package) ----
  { stage: "Acquisition", category: "Acquisition & Title", name: "Purchase and sale agreement", owedBy: "Owner" },
  { stage: "Acquisition", category: "Acquisition & Title", name: "Title report and exceptions", owedBy: "Counsel" },
  { stage: "Acquisition", category: "Acquisition & Title", name: "ALTA survey", owedBy: "Owner" },
  { stage: "Acquisition", category: "Acquisition & Title", name: "Phase I environmental", owedBy: "Owner", optional: true },
  { stage: "Acquisition", category: "Budgets & Pro Forma", name: "Underwriting pro forma (baseline)", owedBy: "Owner" },
  { stage: "Acquisition", category: "Loan & Capital Stack", name: "Executed loan agreement", owedBy: "Owner" },
  { stage: "Acquisition", category: "Loan & Capital Stack", name: "Mezzanine / preferred equity terms", owedBy: "Counsel", optional: true },
  { stage: "Acquisition", category: "Loan & Capital Stack", name: "Interest reserve schedule", owedBy: "Owner" },
  { stage: "Acquisition", category: "Entity & Governance", name: "Borrower entity documents", owedBy: "Counsel" },
  { stage: "Acquisition", category: "Entity & Governance", name: "Operating agreement / JV terms", owedBy: "Counsel" },
  { stage: "Acquisition", category: "Insurance", name: "Builder's risk policy", owedBy: "Owner" },
  { stage: "Acquisition", category: "Insurance", name: "General liability / excess certificates", owedBy: "Owner" },
  { stage: "Acquisition", category: "Insurance", name: "Owner-controlled insurance program (OCIP) manual", owedBy: "Owner", optional: true },

  // ---- Entitlement ----
  { stage: "Entitlement", category: "Entitlement", name: "Zoning analysis", owedBy: "Architect" },
  { stage: "Entitlement", category: "Entitlement", name: "Land-use applications filed", owedBy: "Counsel" },
  { stage: "Entitlement", category: "Entitlement", name: "Approvals and resolutions", owedBy: "Counsel" },
  { stage: "Entitlement", category: "Entitlement", name: "Variances / special permits", owedBy: "Counsel", optional: true },
  { stage: "Entitlement", category: "Entitlement", name: "Agency correspondence file", owedBy: "Counsel" },
  { stage: "Entitlement", category: "Entitlement", name: "Zoning legal opinion", owedBy: "Counsel" },
  { stage: "Entitlement", category: "Entitlement", name: "Environmental review determination", owedBy: "Counsel", optional: true },

  // ---- Design Development ----
  { stage: "Design Development", category: "Design", name: "Architectural set — schematic design", owedBy: "Architect" },
  { stage: "Design Development", category: "Design", name: "Architectural set — design development", owedBy: "Architect" },
  { stage: "Design Development", category: "Design", name: "Architectural set — construction documents", owedBy: "Architect" },
  { stage: "Design Development", category: "Design", name: "Structural drawing set", owedBy: "Architect" },
  { stage: "Design Development", category: "Design", name: "MEP drawing set", owedBy: "Architect" },
  { stage: "Design Development", category: "Design", name: "Façade / curtain wall package", owedBy: "Architect" },
  { stage: "Design Development", category: "Design", name: "Project specifications", owedBy: "Architect" },
  { stage: "Design Development", category: "Contracts & Agreements", name: "Architect agreement (AIA B101 or equivalent)", owedBy: "Counsel" },

  // ---- Preconstruction ----
  { stage: "Preconstruction", category: "Contracts & Agreements", name: "GMP contract / exhibits", owedBy: "CM" },
  { stage: "Preconstruction", category: "Contracts & Agreements", name: "Buyout log and trade contracts", owedBy: "CM" },
  { stage: "Preconstruction", category: "Budgets & Pro Forma", name: "Baseline budget reconciled to pro forma", owedBy: "Owner" },
  { stage: "Preconstruction", category: "Schedule", name: "Baseline CPM schedule", owedBy: "CM" },
  { stage: "Preconstruction", category: "Schedule", name: "Long-lead procurement log", owedBy: "CM" },
  { stage: "Preconstruction", category: "Permits & Violations", name: "New building permit", owedBy: "CM" },
  { stage: "Preconstruction", category: "Permits & Violations", name: "Site safety plan / logistics", owedBy: "CM" },

  // ---- Construction (monthly recurring) ----
  { stage: "Construction", category: "Monthly Recurring", name: "Monthly requisition package", owedBy: "CM", recurring: true },
  { stage: "Construction", category: "Monthly Recurring", name: "Anticipated cost report", owedBy: "CM", recurring: true },
  { stage: "Construction", category: "Monthly Recurring", name: "Monthly schedule update", owedBy: "CM", recurring: true },
  { stage: "Construction", category: "Monthly Recurring", name: "Change order log", owedBy: "CM", recurring: true },
  { stage: "Construction", category: "Monthly Recurring", name: "Lender inspector report", owedBy: "Owner", recurring: true },
  { stage: "Construction", category: "Monthly Recurring", name: "Owner draw reconciliation", owedBy: "Owner", recurring: true },
  { stage: "Construction", category: "Permits & Violations", name: "Open violations / ECB docket pull", owedBy: "CM", recurring: true },
  { stage: "Construction", category: "Contracts & Agreements", name: "Executed change orders", owedBy: "CM" },
  { stage: "Construction", category: "Insurance", name: "Insurance renewal certificates", owedBy: "Owner" },

  // ---- Certificate of Occupancy ----
  { stage: "Certificate of Occupancy", category: "Closeout", name: "Special inspection sign-offs", owedBy: "CM" },
  { stage: "Certificate of Occupancy", category: "Closeout", name: "Final agency inspections", owedBy: "CM" },
  { stage: "Certificate of Occupancy", category: "Closeout", name: "Temporary certificate of occupancy", owedBy: "CM" },
  { stage: "Certificate of Occupancy", category: "Closeout", name: "Certificate of occupancy", owedBy: "CM" },
  { stage: "Certificate of Occupancy", category: "Closeout", name: "Closeout manuals, warranties, as-builts", owedBy: "CM" },
  { stage: "Certificate of Occupancy", category: "Closeout", name: "Final lien waivers", owedBy: "Counsel" },
];

const SOURCES: DocSource[] = ["Owner upload", "Egnyte", "Procore", "Autodesk"];

function seeded(seed: number) {
  let s = (seed * 2654435761) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function dateMinus(days: number): string {
  return isoDaysAgo(days);
}

export interface Register {
  items: DocItem[];
  requiredCount: number;
  receivedCount: number;
  outstanding: DocItem[];
  completeness: number;
  confidence: "Full" | "High" | "Moderate" | "Limited";
  ownerOutstanding: DocItem[];
  ownerStaleDays: number;
  disclosureIncomplete: boolean;
}

export function registerFor(project: Project): Register {
  const cut = stageCutFor(project);
  const rnd = seeded(project.id + 7);
  const items: DocItem[] = REGISTER.map((spec, i) => {
    const stageIdx = LIFECYCLE.indexOf(spec.stage);
    const key = `${project.id}-${i}`;
    if (stageIdx > cut) {
      return {
        ...spec,
        key,
        required: false,
        status: "not-yet-applicable" as const,
        requestedOn: null,
        receivedOn: null,
        daysOutstanding: 0,
        source: null,
        indexed: false,
      };
    }
    const required = !spec.optional;
    const r = rnd();
    // Older stages are more complete; owner-owed items lag slightly.
    const base = 0.9 - (cut - stageIdx) * -0.02 - (spec.owedBy === "Owner" ? 0.16 : 0.04);
    const received = r < base;
    const requestedDays = 12 + Math.floor(rnd() * 90);
    return {
      ...spec,
      key,
      required,
      status: received ? ("received" as const) : ("outstanding" as const),
      requestedOn: dateMinus(requestedDays),
      receivedOn: received ? dateMinus(Math.max(1, requestedDays - 3 - Math.floor(rnd() * 20))) : null,
      daysOutstanding: received ? 0 : requestedDays,
      source: received ? ((SOURCES[Math.floor(rnd() * SOURCES.length)] ?? "Egnyte") as DocSource) : null,
      indexed: received ? rnd() > 0.12 : false,
    };
  });

  // Flagship demo project: pin a legible, storyline-consistent gap.
  if (project.id === 0) {
    const pin = (name: string, days: number) => {
      const it = items.find((x) => x.name === name);
      if (!it || it.status === "not-yet-applicable") return;
      it.status = "outstanding";
      it.receivedOn = null;
      it.source = null;
      it.indexed = false;
      it.daysOutstanding = days;
      it.requestedOn = dateMinus(days);
    };
    pin("Interest reserve schedule", 31);
    pin("Owner draw reconciliation", 22);
    pin("Lender inspector report", 17);
    pin("Insurance renewal certificates", 9);
    pin("Baseline budget reconciled to pro forma", 41);
    pin("Executed change orders", 12);
  }

  const applicable = items.filter((i) => i.status !== "not-yet-applicable");
  const requiredItems = applicable.filter((i) => i.required);
  const receivedCount = requiredItems.filter((i) => i.status === "received").length;
  const outstanding = requiredItems.filter((i) => i.status === "outstanding");
  const completeness = requiredItems.length
    ? Math.round((receivedCount / requiredItems.length) * 100)
    : 100;
  const ownerOutstanding = applicable.filter(
    (i) => i.owedBy === "Owner" && i.status === "outstanding",
  );
  const ownerStaleDays = ownerOutstanding.reduce((m, i) => Math.max(m, i.daysOutstanding), 0);

  const confidence: Register["confidence"] =
    outstanding.length === 0
      ? "Full"
      : completeness >= 95
        ? "High"
        : completeness >= 82
          ? "Moderate"
          : "Limited";

  return {
    items,
    requiredCount: requiredItems.length,
    receivedCount,
    outstanding,
    completeness,
    confidence,
    ownerOutstanding,
    ownerStaleDays,
    disclosureIncomplete: ownerStaleDays > 14 || ownerOutstanding.length >= 3,
  };
}

export const CONFIDENCE_COLOR: Record<Register["confidence"], string> = {
  Full: "var(--cz-good)",
  High: "var(--cz-good)",
  Moderate: "var(--cz-warn)",
  Limited: "var(--cz-critical)",
};

/** Portfolio-wide owner-disclosure flags for the Daily Digest. */
export function disclosureFlags(limit = 6, list: Project[] = projects) {
  return list
    .map((p) => ({ project: p, reg: registerFor(p) }))
    .filter((x) => x.reg.disclosureIncomplete)
    .sort((a, b) => b.reg.ownerStaleDays - a.reg.ownerStaleDays)
    .slice(0, limit);
}
