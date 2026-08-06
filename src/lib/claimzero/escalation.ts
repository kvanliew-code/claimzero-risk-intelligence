// Escalation engine — the Reviewer Queue's supply. Every candidate item is
// produced by a rule row in public.escalation_rules firing against real
// control-instance status. Nothing here is a literal.

import { supabase } from "@/integrations/supabase/client";
import type { ControlInstance, ControlSpec, ControlStatus } from "./controls";
import type { StatusName, Project } from "./data";

export interface SpecEscalationRule {
  id: string;
  rule_id: string | null;
  aspect_id: string | null;
  name: string;
  description: string;
  conditions: string;
  severity_floor: string;
  action: string;
  false_positive_checks: string;
  stages: number[];
  active: boolean;
}

export interface RuleHit {
  key: string;
  rule: SpecEscalationRule;
  project_id: number;
  project_name: string;
  aspect_id: string;
  control_id: string;
  control_title: string;
  status: ControlStatus;
  criticality: string;
  irreversibility: string;
  severity: StatusName;
  headline: string;
  detail: string;
  evidence_ref: string;
  otherControls: number;
}

export async function fetchSpecRules(): Promise<SpecEscalationRule[]> {
  const { data, error } = await supabase
    .from("escalation_rules")
    .select("*")
    .eq("active", true)
    .order("rule_id");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: String(r.id),
    rule_id: (r as { rule_id?: string | null }).rule_id ?? null,
    aspect_id: (r as { aspect_id?: string | null }).aspect_id ?? null,
    name: r.name,
    description: r.description ?? "",
    conditions: (r as { conditions?: string }).conditions ?? "",
    severity_floor: (r as { severity_floor?: string }).severity_floor ?? r.severity ?? "YELLOW",
    action: (r as { action?: string }).action ?? "",
    false_positive_checks: (r as { false_positive_checks?: string }).false_positive_checks ?? "",
    stages: Array.isArray((r as { stages?: number[] }).stages)
      ? ((r as { stages?: number[] }).stages as number[])
      : [],
    active: r.active,
  }));
}

/** The severity floor a rule declares, mapped onto the product's status names. */
export function severityOf(floor: string): StatusName {
  const f = (floor || "").toUpperCase();
  if (f.startsWith("RED")) return "Critical";
  if (f.startsWith("ORANGE") || f.startsWith("AMBER")) return "Serious";
  if (f.startsWith("YELLOW")) return "Watch";
  return "Stable";
}

/** Statuses that mean the control's requirement is not satisfied on evidence. */
const UNSATISFIED: ControlStatus[] = [
  "ADVERSE",
  "BLOCKED",
  "OVERDUE",
  "EVIDENCE_NOT_LOCATED",
  "NOT_STARTED",
  "CONTROLLED_ASSUMPTION",
  "COMPLETE_UNVERIFIED",
  "IN_PROGRESS",
];

/** The order in which an unsatisfied status is worth escalating. */
const SEVERITY_RANK: Record<string, number> = {
  ADVERSE: 6,
  BLOCKED: 5,
  OVERDUE: 4,
  EVIDENCE_NOT_LOCATED: 3,
  CONTROLLED_ASSUMPTION: 2,
  NOT_STARTED: 2,
  COMPLETE_UNVERIFIED: 1,
  IN_PROGRESS: 1,
};

/**
 * Fire every rule whose stage window the project has reached, against the
 * controls mapped to the rule's aspect. A rule fires on the single worst
 * unsatisfied control in its aspect and cites it by id.
 */
export function evaluateRules(
  rules: SpecEscalationRule[],
  register: ControlSpec[],
  instances: Map<string, ControlInstance>,
  project: Project,
  stageNumber: number,
): RuleHit[] {
  const hits: RuleHit[] = [];

  for (const rule of rules) {
    if (!rule.aspect_id) continue;
    if (rule.stages.length && !rule.stages.some((s) => s <= stageNumber)) continue;

    const candidates = register
      .filter(
        (c) =>
          c.aspect_id === rule.aspect_id &&
          c.stage_number <= stageNumber &&
          (rule.stages.length === 0 || rule.stages.includes(c.stage_number) || c.continuous),
      )
      .map((c) => ({ spec: c, status: instances.get(c.control_id)?.status as ControlStatus }))
      .filter((x) => x.status && UNSATISFIED.includes(x.status));

    if (candidates.length === 0) continue;

    candidates.sort((a, b) => {
      const critical = (s: string) => (s === "CRITICAL" ? 2 : s === "HIGH" ? 1 : 0);
      return (
        (SEVERITY_RANK[b.status] ?? 0) - (SEVERITY_RANK[a.status] ?? 0) ||
        critical(b.spec.criticality) - critical(a.spec.criticality)
      );
    });

    const worst = candidates[0]!;
    const floorSeverity = severityOf(rule.severity_floor);
    const severity: StatusName =
      worst.status === "ADVERSE" || worst.spec.criticality === "CRITICAL"
        ? floorSeverity === "Stable"
          ? "Watch"
          : floorSeverity
        : floorSeverity === "Critical"
          ? "Serious"
          : floorSeverity;

    hits.push({
      key: `${project.id}:${rule.rule_id ?? rule.id}`,
      rule,
      project_id: project.id,
      project_name: project.name,
      aspect_id: rule.aspect_id,
      control_id: worst.spec.control_id,
      control_title: worst.spec.title || worst.spec.requirement,
      status: worst.status,
      criticality: worst.spec.criticality,
      irreversibility: worst.spec.irreversibility,
      severity,
      headline: rule.name,
      detail: rule.description,
      evidence_ref: worst.spec.expected_evidence,
      otherControls: candidates.length - 1,
    });
  }

  hits.sort((a, b) => {
    const rank = (s: StatusName) =>
      s === "Critical" ? 3 : s === "Serious" ? 2 : s === "Watch" ? 1 : 0;
    return rank(b.severity) - rank(a.severity) || a.rule.rule_id!.localeCompare(b.rule.rule_id!);
  });
  return hits;
}

/** Promote a fired rule into the reviewer queue as a pending item. */
export async function submitHit(
  hit: RuleHit,
  aspectName: string,
  submittedBy: string,
): Promise<void> {
  const { error } = await supabase.from("review_items").insert({
    project_id: hit.project_id,
    project_name: hit.project_name,
    kind: "risk",
    control_id: hit.control_id,
    aspect_id: hit.aspect_id,
    aspect_name: aspectName,
    headline: `${hit.rule.rule_id ?? "RULE"} — ${hit.headline}`,
    detail: `${hit.detail} Fired on ${hit.control_id} (${hit.control_title}), status ${hit.status}. Required action: ${hit.rule.action} False-positive checks: ${hit.rule.false_positive_checks || "none recorded"}.`,
    exposure_usd: 0,
    severity: hit.severity,
    confidence: hit.status === "EVIDENCE_NOT_LOCATED" ? "Limited" : "Full",
    evidence_ref: hit.evidence_ref,
    source_excerpt: hit.rule.conditions,
    submitted_by: submittedBy,
    status: "PENDING",
  });
  if (error) throw error;
}
