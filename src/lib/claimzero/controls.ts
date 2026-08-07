// ClaimZero — Control Register engine.
// Every control, stage weighting, exit criterion and escalation rule is DATA
// (Lovable Cloud tables), never code. New stage specifications load by import.

import { supabase } from "@/integrations/supabase/client";
import type { Project } from "./data";
import { demoStatus, isDemoProject } from "./demo";

export const CONTROL_STATUSES = [
  "N/A",
  "NOT_STARTED",
  "EVIDENCE_NOT_LOCATED",
  "IN_PROGRESS",
  "COMPLETE_UNVERIFIED",
  "COMPLETE_VERIFIED",
  "CONTROLLED_ASSUMPTION",
  "BLOCKED",
  "OVERDUE",
  "ADVERSE",
  "ACCEPTED_RISK",
  "SUPERSEDED",
] as const;
export type ControlStatus = (typeof CONTROL_STATUSES)[number];

export const STATUS_LABEL: Record<ControlStatus, string> = {
  "N/A": "N/A",
  NOT_STARTED: "Not Started",
  EVIDENCE_NOT_LOCATED: "Evidence Not Located",
  IN_PROGRESS: "In Progress",
  COMPLETE_UNVERIFIED: "Complete — Unverified",
  COMPLETE_VERIFIED: "Complete — Verified",
  CONTROLLED_ASSUMPTION: "Controlled Assumption",
  BLOCKED: "Blocked",
  OVERDUE: "Overdue",
  ADVERSE: "Adverse",
  ACCEPTED_RISK: "Accepted Risk",
  SUPERSEDED: "Superseded",
};

export const DOMAINS = ["cost", "schedule", "design", "quality", "people", "compliance"] as const;
export type Domain = (typeof DOMAINS)[number];

/** v4.0 §5 — control-side tiers. Ordinal, weakest first. */
export const CONTROL_TIERS = ["CORE", "EXTENDED", "COMPREHENSIVE"] as const;
export type ControlTier = (typeof CONTROL_TIERS)[number];

/** v4.0 §5 — project-side tiers. ESSENTIAL sees CORE only; COMPREHENSIVE sees all. */
export const PROJECT_TIERS = ["ESSENTIAL", "STANDARD", "COMPREHENSIVE"] as const;
export type ProjectTier = (typeof PROJECT_TIERS)[number];

/** Historic alias — project tier is the one the scoring engine takes. */
export type Tier = ProjectTier;

export const CRITICALITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type Criticality = (typeof CRITICALITIES)[number];

export const IRREVERSIBILITIES = ["VERY_HIGH", "HIGH", "MEDIUM", "LOW"] as const;
export type Irreversibility = (typeof IRREVERSIBILITIES)[number];

export const DELIVERY_MODELS = ["SEQUENTIAL", "FAST_TRACK", "DESIGN_BUILD", "HYBRID"] as const;

export const CRITICALITY_COLOR: Record<Criticality, string> = {
  CRITICAL: "var(--cz-critical)",
  HIGH: "var(--cz-serious)",
  MEDIUM: "var(--cz-warn)",
  LOW: "var(--cz-ink-3)",
};

export const IRREVERSIBILITY_COLOR: Record<Irreversibility, string> = {
  VERY_HIGH: "var(--cz-critical)",
  HIGH: "var(--cz-serious)",
  MEDIUM: "var(--cz-warn)",
  LOW: "var(--cz-ink-3)",
};

export const STATUS_COLOR: Record<ControlStatus, string> = {
  "N/A": "var(--cz-ink-3)",
  NOT_STARTED: "var(--cz-serious)",
  EVIDENCE_NOT_LOCATED: "var(--cz-critical)",
  IN_PROGRESS: "var(--cz-warn)",
  COMPLETE_UNVERIFIED: "var(--cz-warn)",
  COMPLETE_VERIFIED: "var(--cz-good)",
  CONTROLLED_ASSUMPTION: "var(--cz-warn)",
  BLOCKED: "var(--cz-critical)",
  OVERDUE: "var(--cz-critical)",
  ADVERSE: "var(--cz-critical)",
  ACCEPTED_RISK: "var(--cz-ink-2)",
  SUPERSEDED: "var(--cz-ink-3)",
};

/** v4.0 §6 — the thirteen artefact classes a control can be satisfied by. */
export const EVIDENCE_CLASSES = [
  "INTERNAL_ANALYSIS",
  "EXECUTED_INSTRUMENT",
  "SCHEDULE_ARTIFACT",
  "LOG_OR_REGISTER",
  "AGENCY_ISSUANCE",
  "DESIGN_DELIVERABLE",
  "RECORD_OTHER",
  "FINANCIAL_STATEMENT",
  "THIRD_PARTY_REPORT",
  "CORRESPONDENCE_NOTICE",
  "INSPECTION_TEST_RECORD",
  "INSURANCE_BOND",
  "ATTESTATION",
] as const;
export type EvidenceClass = (typeof EVIDENCE_CLASSES)[number];

/**
 * v4.0 §6 — what a reviewer must do before COMPLETE_VERIFIED is permitted,
 * ordered weakest to strongest. NOT_VERIFIABLE_BY_DOCUMENT can never reach
 * COMPLETE_VERIFIED at all, so it sits outside the ordinal scale.
 */
export const VERIFICATION_METHODS = [
  "DOCUMENT_ON_FILE",
  "SOURCE_VERIFIED",
  "RECOMPUTED",
  "AGENCY_CONFIRMED",
  "COUNTERPARTY_CONFIRMED",
  "NOT_VERIFIABLE_BY_DOCUMENT",
] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export interface ControlSpec {

  id: string;
  control_id: string;
  stage_number: number;
  stage_name: string;
  family_code: string;
  family_name: string;
  requirement: string;
  expected_evidence: string;
  primary_owner_role: string;
  dependency: string;
  min_tier: ControlTier;
  domain: Domain;
  /** Cross-cutting: evaluated in every stage gate from stage_number forward. */
  continuous: boolean;
  active: boolean;
  criticality: Criticality;
  irreversibility: Irreversibility;
  inherits_forward: boolean;
  title: string;
  objective: string;
  responsible_seat: string;
  supporting_seats: string;
  trigger_logic: string;
  dependencies: string;
  downstream_exposure: string;
  /** Comma-separated delivery models; blank means all. */
  applicable_delivery_models: string;
  /** v4.0 — what kind of artefact satisfies this control. */
  evidence_class: EvidenceClass | "";
  /** v4.0 — what the reviewer must do before COMPLETE_VERIFIED is permitted. */
  verification_method: VerificationMethod | "";
  /** Aspect roll-up (A01–A15), derived from family_code by the register. */
  aspect_id: string | null;
}



export interface ControlInstance {
  id: string;
  project_id: number;
  control_id: string;
  status: ControlStatus;
  evidence_ref: string;
  verified_by: string;
  verified_date: string | null;
  notes: string;
}

export interface StageConfig {
  stage_number: number;
  stage_name: string;
  domain_weights: Record<string, number>;
  exit_criteria: string[];
}

export interface EscalationRule {
  id: string;
  name: string;
  description: string;
  scope: string;
  condition: Record<string, unknown>;
  severity: string;
  active: boolean;
}

/** Legacy project stage labels mapped onto the seven-stage lifecycle. */
const STAGE_NUMBER: Record<string, number> = {
  "Pre-Acquisition": 1,
  Entitlement: 2,
  Design: 3,
  Preconstruction: 4,
  Construction: 5,
  Closeout: 6,
  Sellout: 7,
};

export const stageNumberFor = (p: Project): number => STAGE_NUMBER[p.stage] ?? 1;

/**
 * v4.0 §5 — engagement default from contract value: under $25M ESSENTIAL,
 * $25M–$100M STANDARD, above $100M COMPREHENSIVE. Overridable with a reason.
 */
export const tierForValue = (sizeM: number): ProjectTier =>
  sizeM > 100 ? "COMPREHENSIVE" : sizeM >= 25 ? "STANDARD" : "ESSENTIAL";

export const tierFor = (p: Project): ProjectTier => tierForValue(p.sizeM);

const CONTROL_TIER_RANK: Record<ControlTier, number> = {
  CORE: 1,
  EXTENDED: 2,
  COMPREHENSIVE: 3,
};
const PROJECT_TIER_RANK: Record<ProjectTier, number> = {
  ESSENTIAL: 1,
  STANDARD: 2,
  COMPREHENSIVE: 3,
};

/** ESSENTIAL sees CORE, STANDARD sees CORE+EXTENDED, COMPREHENSIVE sees everything. */
export function appliesTo(spec: ControlSpec, stageNumber: number, tier: ProjectTier): boolean {
  return (
    spec.active &&
    spec.stage_number <= stageNumber &&
    (PROJECT_TIER_RANK[tier] ?? 0) >= (CONTROL_TIER_RANK[spec.min_tier] ?? 99)
  );
}


/** Deterministic demo status so a freshly generated project reads as live work. */
export function seededStatus(projectId: number, controlId: string, stageNumber: number, current: number): ControlStatus {
  if (isDemoProject(projectId)) return demoStatus(controlId, stageNumber, current);
  let h = projectId * 2654435761;
  for (const ch of controlId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = (h % 100) / 100;
  const behind = current - stageNumber; // earlier stages are mostly closed out
  if (behind >= 2) return r < 0.9 ? "COMPLETE_VERIFIED" : "EVIDENCE_NOT_LOCATED";
  if (behind === 1) return r < 0.75 ? "COMPLETE_VERIFIED" : r < 0.85 ? "IN_PROGRESS" : "EVIDENCE_NOT_LOCATED";
  if (r < 0.3) return "COMPLETE_VERIFIED";
  if (r < 0.38) return "COMPLETE_UNVERIFIED";
  if (r < 0.62) return "IN_PROGRESS";
  if (r < 0.84) return "NOT_STARTED";
  return "EVIDENCE_NOT_LOCATED";

}

export async function fetchRegister(): Promise<ControlSpec[]> {
  const { data, error } = await supabase
    .from("control_register")
    .select("*")
    .order("stage_number")
    .order("control_id");
  if (error) throw error;
  return (data ?? []) as unknown as ControlSpec[];
}

export async function fetchStages(): Promise<StageConfig[]> {
  const { data, error } = await supabase.from("lifecycle_stages").select("*").order("stage_number");
  if (error) throw error;
  return (data ?? []).map((s) => ({
    stage_number: s.stage_number,
    stage_name: s.stage_name,
    domain_weights: (s.domain_weights ?? {}) as Record<string, number>,
    exit_criteria: Array.isArray(s.exit_criteria) ? (s.exit_criteria as string[]) : [],
  }));
}

export async function fetchEscalationRules(): Promise<EscalationRule[]> {
  const { data, error } = await supabase.from("escalation_rules").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as EscalationRule[];
}

/**
 * Generate the control instances for a project: one per applicable register
 * control. Idempotent — re-running only fills in newly imported controls, so
 * loading a new stage specification requires zero code changes.
 */
export async function ensureInstances(
  project: Project,
  register: ControlSpec[],
): Promise<ControlInstance[]> {
  const stageNumber = stageNumberFor(project);
  const tier = tierFor(project);
  const applicable = register.filter((c) => appliesTo(c, stageNumber, tier));

  const { data: existing, error } = await supabase
    .from("project_controls")
    .select("*")
    .eq("project_id", project.id);
  if (error) throw error;
  const have = new Set((existing ?? []).map((r) => r.control_id));
  const missing = applicable.filter((c) => !have.has(c.control_id));

  if (missing.length > 0) {
    const rows = missing.map((c) => ({
      project_id: project.id,
      control_id: c.control_id,
      status: seededStatus(project.id, c.control_id, c.stage_number, stageNumber),
    }));
    const { error: insErr } = await supabase
      .from("project_controls")
      .upsert(rows, { onConflict: "project_id,control_id", ignoreDuplicates: true });
    if (insErr) throw insErr;
    const { data: refreshed } = await supabase
      .from("project_controls")
      .select("*")
      .eq("project_id", project.id);
    return (refreshed ?? []) as unknown as ControlInstance[];
  }
  return (existing ?? []) as unknown as ControlInstance[];
}

export interface StageGate {
  stage: StageConfig;
  applicable: number;
  verified: number;
  completeness: number;
  ready: boolean;
  openItems: { control_id: string; requirement: string; status: ControlStatus }[];
}

export function stageGate(
  stage: StageConfig,
  register: ControlSpec[],
  instances: Map<string, ControlInstance>,
  stageNumber: number,
  tier: Tier,
): StageGate {
  const specs = register.filter(
    (c) =>
      appliesTo(c, stageNumber, tier) &&
      (c.continuous
        ? c.stage_number <= stage.stage_number
        : c.stage_number === stage.stage_number),
  );

  // N/A controls are excluded from both numerator and denominator.
  const scored = specs.filter((c) => instances.get(c.control_id)?.status !== "N/A");

  const open = scored
    .map((c) => ({ spec: c, inst: instances.get(c.control_id) }))
    .filter((x) => x.inst?.status !== "COMPLETE_VERIFIED")
    .map((x) => ({
      control_id: x.spec.control_id,
      requirement: x.spec.requirement,
      status: (x.inst?.status ?? "EVIDENCE_NOT_LOCATED") as ControlStatus,
    }));
  const verified = scored.length - open.length;
  return {
    stage,
    applicable: scored.length,
    verified,
    completeness: scored.length ? Math.round((verified / scored.length) * 100) : 0,
    ready: scored.length > 0 && open.length === 0,
    openItems: open,
  };
}

/** Evaluate configured escalation rules against a project's control instances. */
export function evaluateEscalations(
  rules: EscalationRule[],
  register: ControlSpec[],
  instances: Map<string, ControlInstance>,
  stageCompleteness: number,
): { rule: EscalationRule; hits: string[] }[] {
  const out: { rule: EscalationRule; hits: string[] }[] = [];
  for (const rule of rules.filter((r) => r.active)) {
    const c = rule.condition ?? {};
    const hits: string[] = [];
    if (rule.scope === "metric" && c['metric'] === "stage_completeness") {
      const v = Number(c['value'] ?? 0);
      if (c['operator'] === "lt" && stageCompleteness < v) {
        hits.push(`Stage completeness ${stageCompleteness}% is below ${v}%`);
      }
    } else if (rule.scope === "project" && c['operator'] === "count_gte") {
      const owner = String(c['owner_role'] ?? "");
      const n = register.filter(
        (s) =>
          s.primary_owner_role === owner &&
          instances.has(s.control_id) &&
          instances.get(s.control_id)!.status !== String(c['status_not']),
      );
      if (n.length >= Number(c['value'] ?? 0)) {
        hits.push(`${n.length} ${owner}-owed controls are not Complete-Verified`);
      }
    } else {
      for (const spec of register) {
        const inst = instances.get(spec.control_id);
        if (!inst) continue;
        if (c['domain'] && spec.domain !== c['domain']) continue;
        if (c['value'] && inst.status !== c['value']) continue;
        hits.push(`${spec.control_id} — ${spec.requirement}`);
      }
    }
    if (hits.length > 0) out.push({ rule, hits });
  }
  return out;
}

/** Composite Risk Index weighting for a stage, normalised to sum to 1. */
export function weightsFor(stage: StageConfig | undefined): Record<string, number> {
  const w = stage?.domain_weights ?? {};
  const total = Object.values(w).reduce((a, b) => a + Number(b), 0) || 1;
  return Object.fromEntries(Object.entries(w).map(([k, v]) => [k, Number(v) / total]));
}

export const REGISTER_CSV_COLUMNS = [
  "control_id",
  "stage_number",
  "stage_name",
  "family_code",
  "family_name",
  "requirement",
  "expected_evidence",
  "primary_owner_role",
  "dependency",
  "min_tier",
  "domain",
  "continuous",
  "criticality",
  "irreversibility",
  "inherits_forward",
  "title",
  "objective",
  "responsible_seat",
  "supporting_seats",
  "trigger_logic",
  "dependencies",
  "downstream_exposure",
  "applicable_delivery_models",
  "evidence_class",
  "verification_method",
] as const;



/** Minimal RFC-4180 CSV parser (quoted fields, embedded commas and newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/**
 * v4.0 accepts either the legacy A/B/C control tiers or the CORE/EXTENDED/
 * COMPREHENSIVE labels. Returns null for anything unrecognised — the caller
 * must surface that as an import error rather than substituting a default.
 * A silent default here is what pushed every row to a single tier last time.
 */
export function normaliseControlTier(raw: string): ControlTier | null {
  const v = raw.trim().toUpperCase();
  if (v === "A" || v === "CORE") return "CORE";
  if (v === "B" || v === "EXTENDED") return "EXTENDED";
  if (v === "C" || v === "COMPREHENSIVE") return "COMPREHENSIVE";
  return null;
}

export function csvToControls(text: string): Partial<ControlSpec>[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0]!.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return rows.slice(1).map((r) => {
    const rec: Record<string, unknown> = {};
    header.forEach((h, i) => {
      const v = (r[i] ?? "").trim();
      if (!REGISTER_CSV_COLUMNS.includes(h as (typeof REGISTER_CSV_COLUMNS)[number])) return;
      if (h === "stage_number") rec[h] = Number(v);
      else if (h === "continuous" || h === "inherits_forward") rec[h] = /^(true|yes|y|1)$/i.test(v);
      else if (h === "min_tier") {
        const tier = normaliseControlTier(v);
        // Never coerce. registerCsvIssues() blocks the import when this is null.
        if (tier) rec[h] = tier;
      } else if (h === "criticality") {
        const up = v.toUpperCase().replace(/[\s-]+/g, "_");
        rec[h] = CRITICALITIES.includes(up as Criticality) ? up : "HIGH";
      } else if (h === "irreversibility") {
        const up = v.toUpperCase().replace(/[\s-]+/g, "_");
        rec[h] = IRREVERSIBILITIES.includes(up as Irreversibility) ? up : "MEDIUM";
      } else if (h === "evidence_class") {
        const up = v.toUpperCase().replace(/[\s-]+/g, "_");
        rec[h] = EVIDENCE_CLASSES.includes(up as EvidenceClass) ? up : "";
      } else if (h === "verification_method") {
        const up = v.toUpperCase().replace(/[\s-]+/g, "_");
        rec[h] = VERIFICATION_METHODS.includes(up as VerificationMethod) ? up : "";
      } else if (h === "applicable_delivery_models") {
        rec[h] = v
          .split(",")
          .map((m) => m.trim().toUpperCase().replace(/[\s-]+/g, "_"))
          .filter((m) => (DELIVERY_MODELS as readonly string[]).includes(m))
          .join(",");
      } else rec[h] = v;
    });
    return rec as Partial<ControlSpec>;
  });
}

/**
 * Pre-flight gate for a register import. An import that reports issues must be
 * refused outright: a partially-coerced register is worse than no import.
 */
export function registerCsvIssues(text: string): string[] {
  const rows = parseCsv(text);
  const issues: string[] = [];
  if (rows.length < 2) return ["File contains no data rows."];
  const header = rows[0]!.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

  for (const required of ["control_id", "min_tier", "stage_number", "family_code"]) {
    if (!header.includes(required)) issues.push(`Missing required column: ${required}`);
  }
  if (issues.length > 0) return issues;

  const tierIdx = header.indexOf("min_tier");
  const idIdx = header.indexOf("control_id");
  const seen = new Set<string>();
  let badTier = 0;
  let blankTier = 0;

  for (const r of rows.slice(1)) {
    const id = (r[idIdx] ?? "").trim();
    if (!id) continue;
    if (seen.has(id)) issues.push(`Duplicate control_id: ${id}`);
    seen.add(id);
    const raw = (r[tierIdx] ?? "").trim();
    if (!raw) blankTier++;
    else if (!normaliseControlTier(raw)) badTier++;
  }
  if (blankTier > 0) issues.push(`${blankTier} row(s) have a blank min_tier. Tiers are never defaulted.`);
  if (badTier > 0) issues.push(`${badTier} row(s) have an unrecognised min_tier value.`);

  // A register that lands on one tier is the signature of the v3.0 defect.
  const tiers = new Set(
    rows.slice(1).map((r) => normaliseControlTier((r[tierIdx] ?? "").trim())).filter(Boolean),
  );
  if (seen.size > 50 && tiers.size === 1) {
    issues.push(`All ${seen.size} rows resolved to a single tier — refusing the import.`);
  }
  return issues.slice(0, 25);
}


export function controlsToCsv(rows: ControlSpec[]): string {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    REGISTER_CSV_COLUMNS.join(","),
    ...rows.map((r) =>
      REGISTER_CSV_COLUMNS.map((c) => esc((r as unknown as Record<string, unknown>)[c])).join(","),
    ),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Family applicability (v1.0 rules). The predicate grammar is evaluated by the
// database function get_project_family_applicability — one implementation, on
// the server, used by every consumer. Nothing re-implements it client-side.
// ---------------------------------------------------------------------------

export interface FamilyVerdict {
  family_code: string;
  applies: boolean;
  reason: string;
}

export type FamilyApplicability = Map<string, FamilyVerdict>;

export async function fetchFamilyApplicability(projectId: number): Promise<FamilyApplicability> {
  const { data, error } = await supabase.rpc("get_project_family_applicability", {
    p_project_id: projectId,
  });
  if (error) throw error;
  const out: FamilyApplicability = new Map();
  for (const row of (data ?? []) as FamilyVerdict[]) {
    out.set(row.family_code, {
      family_code: row.family_code,
      applies: row.applies !== false,
      reason: row.reason ?? "Family does not apply to this project profile",
    });
  }
  return out;
}

/** A family is suppressed only when the engine says so; unknown families apply. */
export const familyApplies = (fa: FamilyApplicability | undefined, code: string): boolean =>
  fa ? (fa.get(code)?.applies ?? true) : true;

export const suppressionReason = (
  fa: FamilyApplicability | undefined,
  code: string,
): string | null => {
  const v = fa?.get(code);
  return v && !v.applies ? v.reason : null;
};
