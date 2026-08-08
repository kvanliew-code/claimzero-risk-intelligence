// ClaimZero Scoring Specification v1.0 — the single source of every score.
// Control status becomes an aspect score, a stage gate and the Composite
// Project Risk Index. Nothing here is hand-entered; every input is register
// data plus control-instance status.

import { supabase } from "@/integrations/supabase/client";
import {
  appliesTo,
  familyApplies,
  type FamilyApplicability,
  type ControlInstance,
  type ControlSpec,
  type ControlStatus,
  type Criticality,
  type Tier,
} from "./controls";

export interface AspectDef {
  aspect_id: string;
  aspect_name: string;
  owner_question: string;
  family_codes: string;
}

export interface ExitCriterion {
  criterion_id: string;
  stage_number: number;
  stage_name: string;
  exit_criterion: string;
  evidence_required: string;
  blocking: string; // HARD | SOFT
  linked_families: string;
  active: boolean;
}

/** §2 Control weight — criticality drives the weight of every applicable control. */
export const CRITICALITY_WEIGHT: Record<Criticality, number> = {
  CRITICAL: 3.0,
  HIGH: 2.0,
  MEDIUM: 1.5,
  LOW: 1.0,
};

export const weightOf = (c: ControlSpec): number =>
  CRITICALITY_WEIGHT[c.criticality] ?? CRITICALITY_WEIGHT.HIGH;

export type ConfidenceBand = "FULL" | "LIMITED" | "INSUFFICIENT";

export const bandOf = (confidence: number): ConfidenceBand =>
  confidence >= 90 ? "FULL" : confidence >= 60 ? "LIMITED" : "INSUFFICIENT";

export const BAND_COLOR: Record<ConfidenceBand, string> = {
  FULL: "var(--cz-good)",
  LIMITED: "var(--cz-warn)",
  INSUFFICIENT: "var(--cz-critical)",
};

export async function fetchAspects(): Promise<AspectDef[]> {
  const { data, error } = await supabase.from("aspects").select("*").order("aspect_id");
  if (error) throw error;
  return (data ?? []) as unknown as AspectDef[];
}

export async function fetchExitCriteria(): Promise<ExitCriterion[]> {
  const { data, error } = await supabase
    .from("stage_exit_criteria")
    .select("*")
    .eq("active", true)
    .order("criterion_id");
  if (error) throw error;
  return (data ?? []) as unknown as ExitCriterion[];
}

export async function fetchWeightOverrides(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("aspect_weight_overrides").select("*");
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const r of data ?? []) out[`${r.stage_number}:${r.aspect_id}`] = Number(r.weight);
  return out;
}

/**
 * §3 Applicability — stage reached, tier met, delivery model allowed, and the
 * control's family not suppressed by the server-side applicability engine.
 * A suppressed control leaves both the numerator and the denominator, exactly
 * like N/A.
 */
export function isApplicable(
  spec: ControlSpec,
  stageNumber: number,
  tier: Tier,
  deliveryModel?: string,
  familyApplicability?: FamilyApplicability,
): boolean {
  if (!appliesTo(spec, stageNumber, tier)) return false;
  if (!familyApplies(familyApplicability, spec.family_code)) return false;
  const models = (spec.applicable_delivery_models ?? "").trim();
  if (!models || !deliveryModel) return true;
  return models
    .split(",")
    .map((m) => m.trim().toUpperCase())
    .includes(deliveryModel.trim().toUpperCase());
}

const TERMINAL_SATISFIED: ControlStatus[] = ["COMPLETE_VERIFIED"];

export interface AspectScore {
  aspect_id: string;
  aspect_name: string;
  owner_question: string;
  /** null when no applicable control exists at this stage — NOT_YET_APPLICABLE. */
  score: number | null;
  base: number;
  penalty: number;
  confidence: number;
  band: ConfidenceBand;
  applicableWeight: number;
  satisfiedWeight: number;
  evidenceNotLocatedWeight: number;
  controls: number;
  verified: number;
  assertedUnverified: number;
  adverse: number;
  blockedOrOverdue: number;
  criticalIrreversibleOpen: number;
  notApplicable: number;
}

const daysSince = (iso: string | null | undefined): number => {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86_400_000);
};

/** §4 Aspect score + §5 aspect confidence. */
export function scoreAspects(
  aspects: AspectDef[],
  register: ControlSpec[],
  instances: Map<string, ControlInstance>,
  stageNumber: number,
  tier: Tier,
  deliveryModel?: string,
  familyApplicability?: FamilyApplicability,
): AspectScore[] {
  const applicable = register.filter((c) =>
    isApplicable(c, stageNumber, tier, deliveryModel, familyApplicability),
  );
  const byAspect = new Map<string, ControlSpec[]>();
  for (const c of applicable) {
    const key = c.aspect_id ?? "";
    if (!key) continue;
    const list = byAspect.get(key);
    if (list) list.push(c);
    else byAspect.set(key, [c]);
  }

  return aspects.map((a) => {
    const specs = byAspect.get(a.aspect_id) ?? [];
    let applicableWeight = 0;
    let satisfiedWeight = 0;
    let enlWeight = 0;
    let verified = 0;
    let assertedUnverified = 0;
    let adverse = 0;
    let blockedOrOverdue = 0;
    let criticalIrreversibleOpen = 0;
    let notApplicable = 0;

    for (const spec of specs) {
      const inst = instances.get(spec.control_id);
      const status = (inst?.status ?? "EVIDENCE_NOT_LOCATED") as ControlStatus;
      if (status === "N/A") {
        notApplicable++;
        continue; // §3 — excluded from numerator AND denominator
      }
      const w = weightOf(spec);
      applicableWeight += w;
      if (TERMINAL_SATISFIED.includes(status)) {
        satisfiedWeight += w;
        verified++;
      }
      if (status === "COMPLETE_UNVERIFIED") assertedUnverified++;
      if (status === "EVIDENCE_NOT_LOCATED") enlWeight += w;
      if (status === "ADVERSE") adverse++;
      if (
        (status === "BLOCKED" || status === "OVERDUE") &&
        daysSince(inst?.verified_date ?? null) > 30
      )
        blockedOrOverdue++;
      if (
        spec.criticality === "CRITICAL" &&
        spec.irreversibility === "VERY_HIGH" &&
        status !== "COMPLETE_VERIFIED"
      )
        criticalIrreversibleOpen++;
    }

    if (applicableWeight === 0) {
      return {
        aspect_id: a.aspect_id,
        aspect_name: a.aspect_name,
        owner_question: a.owner_question,
        score: null,
        base: 0,
        penalty: 0,
        confidence: 0,
        band: "INSUFFICIENT" as ConfidenceBand,
        applicableWeight: 0,
        satisfiedWeight: 0,
        evidenceNotLocatedWeight: 0,
        controls: specs.length,
        verified: 0,
        assertedUnverified: 0,
        adverse: 0,
        blockedOrOverdue: 0,
        criticalIrreversibleOpen: 0,
        notApplicable,
      };
    }

    const base = 100 * (1 - satisfiedWeight / applicableWeight);
    const penalty =
      (criticalIrreversibleOpen > 0 ? 15 : 0) +
      Math.min(adverse * 10, 30) +
      Math.min(blockedOrOverdue * 5, 20);
    const score = Math.min(100, Math.round(base + penalty));
    const confidence = Math.round(
      100 * ((applicableWeight - enlWeight) / applicableWeight),
    );

    return {
      aspect_id: a.aspect_id,
      aspect_name: a.aspect_name,
      owner_question: a.owner_question,
      score,
      base: Math.round(base),
      penalty,
      confidence,
      band: bandOf(confidence),
      applicableWeight,
      satisfiedWeight,
      evidenceNotLocatedWeight: enlWeight,
      controls: specs.length,
      verified,
      assertedUnverified,
      adverse,
      blockedOrOverdue,
      criticalIrreversibleOpen,
      notApplicable,
    };
  });
}

export interface Composite {
  /** null when composite confidence is below 60 — a number must not be published. */
  index: number | null;
  raw: number;
  confidence: number;
  band: ConfidenceBand;
  weights: Record<string, number>;
  overridden: boolean;
  outstanding: number;
  requiredInputs: number;
  /** Below 25 the engine raises a data-quality flag rather than a congratulation. */
  dataQualityFlag: boolean;
}

/** §6 Composite Project Risk Index — weights derived from control mass, overridable. */
export function composite(
  scores: AspectScore[],
  stageNumber: number,
  overrides: Record<string, number> = {},
): Composite {
  const scored = scores.filter((s) => s.score !== null && s.applicableWeight > 0);
  const totalWeight = scored.reduce((a, s) => a + s.applicableWeight, 0);
  const weights: Record<string, number> = {};
  let overridden = false;
  for (const s of scored) {
    const ov = overrides[`${stageNumber}:${s.aspect_id}`];
    if (ov !== undefined) overridden = true;
    weights[s.aspect_id] = ov !== undefined ? ov : totalWeight ? s.applicableWeight / totalWeight : 0;
  }
  const wSum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(weights)) weights[k] = weights[k]! / wSum;

  const raw = scored.reduce((a, s) => a + (s.score ?? 0) * (weights[s.aspect_id] ?? 0), 0);
  const applicableWeight = scored.reduce((a, s) => a + s.applicableWeight, 0);
  const enl = scored.reduce((a, s) => a + s.evidenceNotLocatedWeight, 0);
  const confidence = applicableWeight
    ? Math.round(100 * ((applicableWeight - enl) / applicableWeight))
    : 0;
  const requiredInputs = scored.reduce((a, s) => a + s.controls, 0);
  const outstanding = scored.reduce((a, s) => a + (s.controls - s.verified - s.notApplicable), 0);
  const index = confidence < 60 ? null : Math.round(raw);

  return {
    index,
    raw: Math.round(raw),
    confidence,
    band: bandOf(confidence),
    weights,
    overridden,
    outstanding,
    requiredInputs,
    dataQualityFlag: index !== null && index < 25,
  };
}

export type GateVerdict = "READY" | "CONDITIONAL — NOT READY" | "AT RISK";

export interface SpecStageGate {
  verdict: GateVerdict;
  completeness: number;
  applicable: number;
  verified: number;
  confidence: number;
  reasons: string[];
  hardCriteria: ExitCriterion[];
  softCriteria: ExitCriterion[];
  unsatisfiedCriteria: { criterion: ExitCriterion; open: string[] }[];
  criticalOpen: { control_id: string; requirement: string; status: ControlStatus }[];
  criticalWithoutSeat: string[];
  criticalIrreversibleOpen: string[];
}

/**
 * §7 Stage gate — evaluated against the stage exit-criteria library, with the
 * gate overrides that outrank the arithmetic.
 */
export function evaluateStageGate(
  stageNumber: number,
  register: ControlSpec[],
  instances: Map<string, ControlInstance>,
  criteria: ExitCriterion[],
  tier: Tier,
  aspectScores: AspectScore[],
  deliveryModel?: string,
  familyApplicability?: FamilyApplicability,
): SpecStageGate {
  const specs = register.filter(
    (c) =>
      isApplicable(c, stageNumber, tier, deliveryModel, familyApplicability) &&
      (c.continuous ? c.stage_number <= stageNumber : c.stage_number === stageNumber),
  );
  const scored = specs.filter((c) => instances.get(c.control_id)?.status !== "N/A");
  const verifiedList = scored.filter(
    (c) => instances.get(c.control_id)?.status === "COMPLETE_VERIFIED",
  );
  const completeness = scored.length
    ? Math.round((verifiedList.length / scored.length) * 100)
    : 0;

  const statusOfSpec = (c: ControlSpec) =>
    (instances.get(c.control_id)?.status ?? "EVIDENCE_NOT_LOCATED") as ControlStatus;

  const criticalOpen = scored
    .filter((c) => c.criticality === "CRITICAL" && statusOfSpec(c) !== "COMPLETE_VERIFIED")
    .map((c) => ({ control_id: c.control_id, requirement: c.requirement, status: statusOfSpec(c) }));

  const criticalWithoutSeat = scored
    .filter(
      (c) =>
        c.criticality === "CRITICAL" &&
        !(c.responsible_seat || c.primary_owner_role || "").trim(),
    )
    .map((c) => c.control_id);

  const criticalIrreversibleOpen = scored
    .filter(
      (c) =>
        c.criticality === "CRITICAL" &&
        c.irreversibility === "VERY_HIGH" &&
        !["COMPLETE_VERIFIED", "ACCEPTED_RISK"].includes(statusOfSpec(c)),
    )
    .map((c) => c.control_id);

  const stageCriteria = criteria.filter((c) => c.stage_number === stageNumber);
  const hardCriteria = stageCriteria.filter((c) => c.blocking.toUpperCase() === "HARD");
  const softCriteria = stageCriteria.filter((c) => c.blocking.toUpperCase() !== "HARD");

  const unsatisfiedCriteria = stageCriteria
    .map((criterion) => {
      const families = criterion.linked_families
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
      const open = scored
        .filter(
          (c) => families.includes(c.family_code) && statusOfSpec(c) !== "COMPLETE_VERIFIED",
        )
        .map((c) => c.control_id);
      return { criterion, open };
    })
    .filter((x) => x.open.length > 0);

  const stageConfidence = (() => {
    const inScope = aspectScores.filter((s) => s.applicableWeight > 0);
    const w = inScope.reduce((a, s) => a + s.applicableWeight, 0);
    const enl = inScope.reduce((a, s) => a + s.evidenceNotLocatedWeight, 0);
    return w ? Math.round(100 * ((w - enl) / w)) : 0;
  })();

  // Defect fixed 8 Aug 2026. The frozen-snapshot line below used to be pushed into
  // `reasons` unconditionally, and the verdict was keyed off `reasons.length`. Because
  // that push always fired, `reasons` was never empty and **no project at any stage on any
  // data could ever return READY**. The gate was not permissive — it was inert, and it
  // reported the same thing forever, which masked the genuinely empty stages 3 and 7.
  //
  // A missing snapshot is a publishing precondition, not a control finding. It stays
  // visible in `reasons` so the UI and the Stage Gate report still show it, but the
  // verdict is now computed from substantive findings only. No closure rule is loosened:
  // every existing check still blocks exactly as it did.
  const blockingReasons: string[] = [];
  const hardOpen = unsatisfiedCriteria.filter(
    (x) => x.criterion.blocking.toUpperCase() === "HARD",
  );
  if (hardOpen.length)
    blockingReasons.push(`${hardOpen.length} hard exit criteria are not satisfied with evidence`);
  if (criticalOpen.length)
    blockingReasons.push(`${criticalOpen.length} CRITICAL controls are not Complete — Verified`);
  if (criticalWithoutSeat.length)
    blockingReasons.push(
      `${criticalWithoutSeat.length} CRITICAL controls have no named responsible seat`,
    );
  if (stageConfidence < 60)
    blockingReasons.push(`Stage confidence is ${stageConfidence}% — below 60`);

  const reasons: string[] = [...blockingReasons];
  reasons.push("No frozen evidence snapshot exists for this stage");

  let verdict: GateVerdict = "READY";
  if (blockingReasons.length > 0) verdict = "CONDITIONAL — NOT READY";
  if (criticalWithoutSeat.length > 0) verdict = "CONDITIONAL — NOT READY";
  if (criticalIrreversibleOpen.length > 0) {
    reasons.unshift(
      `${criticalIrreversibleOpen.length} unresolved CRITICAL / VERY_HIGH irreversibility controls — no accepted-risk record on file`,
    );
    verdict = "AT RISK";
  }

  return {
    verdict,
    completeness,
    applicable: scored.length,
    verified: verifiedList.length,
    confidence: stageConfidence,
    reasons,
    hardCriteria,
    softCriteria,
    unsatisfiedCriteria,
    criticalOpen,
    criticalWithoutSeat,
    criticalIrreversibleOpen,
  };
}

export const scoreColorFor = (score: number | null): string => {
  if (score === null) return "var(--cz-ink-3)";
  if (score >= 65) return "var(--cz-critical)";
  if (score >= 45) return "var(--cz-serious)";
  if (score >= 30) return "var(--cz-warn)";
  return "var(--cz-good)";
};
