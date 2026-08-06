// Pipeline & Business Operations Spec v1.0 — the opportunity layer that sits
// before Client. Two funnels (acquisition, expansion) and a reviewer-capacity
// constraint on the forecast. Every number on the Pipeline screen comes from here.

import { supabase } from "@/integrations/supabase/client";

export const OPP_STAGES = [
  "IDENTIFIED",
  "CONTACTED",
  "MET",
  "DEMO",
  "PROPOSAL",
  "ENGAGED",
  "DELIVERED",
  "MONITORING",
] as const;

export type OppStage = (typeof OPP_STAGES)[number] | "LOST" | "DORMANT";

export const STAGE_MEANING: Record<OppStage, string> = {
  IDENTIFIED: "Known target, no contact made",
  CONTACTED: "Outreach sent, no reply yet",
  MET: "Real conversation, need established",
  DEMO: "Demo delivered",
  PROPOSAL: "Assessment proposal outstanding",
  ENGAGED: "Engagement executed, assessment underway",
  DELIVERED: "Assessment issued to the owner",
  MONITORING: "Weekly Intelligence subscription live",
  LOST: "Closed lost — reason coded",
  DORMANT: "Held, revisit date set",
};

export const STAGE_EXIT: Record<OppStage, string> = {
  IDENTIFIED: "First contact attempted",
  CONTACTED: "Live conversation held",
  MET: "Demo scheduled",
  DEMO: "Proposal requested or sent",
  PROPOSAL: "Signed or lost",
  ENGAGED: "Assessment delivered",
  DELIVERED: "Monitoring decision made",
  MONITORING: "Renewal or churn",
  LOST: "—",
  DORMANT: "Revisit date reached",
};

export const ACQUISITION_STAGES = [
  "IDENTIFIED",
  "CONTACTED",
  "MET",
  "DEMO",
  "PROPOSAL",
  "ENGAGED",
] as const;
export const EXPANSION_STAGES = ["DELIVERED", "MONITORING"] as const;

export const LOSS_REASONS = [
  "INCUMBENT_CM_REPORTS",
  "PRICE",
  "NO_BUDGET",
  "TIMING",
  "OUT_OF_SCOPE_SEGMENT",
  "NO_DECISION",
  "LOST_TO_COMPETITOR",
  "UNRESPONSIVE",
] as const;

export interface Opportunity {
  id: string;
  opportunity_id: string;
  org_name: string;
  org_type: string;
  segment: string;
  contact_name: string;
  contact_title: string;
  email: string;
  phone: string;
  source: string;
  source_detail: string;
  stage: OppStage;
  stage_entered: string | null;
  project_name: string;
  project_value_usd: number;
  assessment_fee_usd: number;
  monitoring_arr_usd: number;
  probability_pct: number;
  expected_close: string | null;
  reviewer_days_required: number;
  next_action: string;
  next_action_date: string | null;
  owner: string;
  notes: string;
  channel_deal: boolean;
  out_of_scope: boolean;
  loss_reason: string;
}

export interface CapacityRow {
  month: string;
  reviewer_days_available: number;
}

export async function fetchOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("opportunity_id");
  if (error) throw new Error(error.message);
  return (data as unknown as Opportunity[] | null) ?? [];
}

export async function fetchCapacity(): Promise<CapacityRow[]> {
  const { data, error } = await supabase
    .from("reviewer_capacity")
    .select("month, reviewer_days_available")
    .order("month");
  if (error) throw new Error(error.message);
  return (data as CapacityRow[] | null) ?? [];
}

export function daysInStage(o: Opportunity, today = new Date()): number {
  if (!o.stage_entered) return 0;
  const t = Date.parse(o.stage_entered + "T00:00:00Z");
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.round((today.getTime() - t) / 86_400_000));
}

/** A deal that counts toward project revenue: not a channel play, not out of scope. */
export function isRevenueDeal(o: Opportunity) {
  return !o.channel_deal && !o.out_of_scope;
}

export function isOpen(o: Opportunity) {
  return o.stage !== "LOST" && o.stage !== "DORMANT";
}

export function usd(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

export interface FunnelTotals {
  count: number;
  assessment: number;
  weightedAssessment: number;
  arr: number;
  weightedArr: number;
  reviewerDays: number;
}

export function totals(list: Opportunity[]): FunnelTotals {
  return list.reduce<FunnelTotals>(
    (a, o) => ({
      count: a.count + 1,
      assessment: a.assessment + o.assessment_fee_usd,
      weightedAssessment: a.weightedAssessment + (o.assessment_fee_usd * o.probability_pct) / 100,
      arr: a.arr + o.monitoring_arr_usd,
      weightedArr: a.weightedArr + (o.monitoring_arr_usd * o.probability_pct) / 100,
      reviewerDays: a.reviewerDays + o.reviewer_days_required,
    }),
    { count: 0, assessment: 0, weightedAssessment: 0, arr: 0, weightedArr: 0, reviewerDays: 0 },
  );
}

/** Assessment-to-monitoring conversion — the expansion funnel number that matters. */
export function expansionConversion(list: Opportunity[]) {
  const reachedDelivery = list.filter(
    (o) => o.stage === "DELIVERED" || o.stage === "MONITORING",
  ).length;
  const converted = list.filter((o) => o.stage === "MONITORING").length;
  return {
    reachedDelivery,
    converted,
    pct: reachedDelivery ? Math.round((converted / reachedDelivery) * 100) : null,
  };
}

export interface ForecastMonth {
  month: string; // YYYY-MM
  label: string;
  deals: number;
  weightedAssessment: number;
  weightedArr: number;
  reviewerDaysRequired: number;
  reviewerDaysAvailable: number;
  over: boolean;
}

const MONTH_LABEL = (ym: string) => {
  const [y, m] = ym.split("-");
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${names[Number(m) - 1]} ${y}`;
};

/**
 * The forecast is never shown without the capacity line beside it: reviewer-days
 * that would be consumed if the deals forecast to close that month actually close.
 */
export function forecast(list: Opportunity[], capacity: CapacityRow[]): ForecastMonth[] {
  const avail = new Map(capacity.map((c) => [c.month.slice(0, 7), c.reviewer_days_available]));
  const buckets = new Map<string, ForecastMonth>();
  for (const o of list) {
    if (!isOpen(o) || !o.expected_close || !isRevenueDeal(o)) continue;
    if (o.stage === "MONITORING") continue;
    const ym = o.expected_close.slice(0, 7);
    const b = buckets.get(ym) ?? {
      month: ym,
      label: MONTH_LABEL(ym),
      deals: 0,
      weightedAssessment: 0,
      weightedArr: 0,
      reviewerDaysRequired: 0,
      reviewerDaysAvailable: avail.get(ym) ?? 0,
      over: false,
    };
    b.deals += 1;
    b.weightedAssessment += (o.assessment_fee_usd * o.probability_pct) / 100;
    b.weightedArr += (o.monitoring_arr_usd * o.probability_pct) / 100;
    b.reviewerDaysRequired += o.reviewer_days_required;
    buckets.set(ym, b);
  }
  return [...buckets.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((b) => ({ ...b, over: b.reviewerDaysRequired > b.reviewerDaysAvailable }));
}
