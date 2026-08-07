// Money and time inputs for a project. These are captured facts (contract sum,
// contingency, baseline vs forecast dates), never derived guesses. The Time &
// Money report reads them alongside the control register so a capital call is
// argued from the record, not from a feeling.

import { supabase } from "@/integrations/supabase/client";

export interface ProjectFinance {
  contract_sum_usd: number;
  land_cost_usd: number;
  hard_cost_usd: number;
  soft_cost_usd: number;
  contingency_total_usd: number;
  contingency_drawn_usd: number;
  change_orders_approved_usd: number;
  change_orders_pending_usd: number;
  equity_committed_usd: number;
  debt_committed_usd: number;
  ld_per_day_usd: number;
  carry_cost_per_day_usd: number;
  baseline_start: string | null;
  baseline_substantial_completion: string | null;
  forecast_substantial_completion: string | null;
  loan_maturity: string | null;
}

export const FINANCE_COLUMNS = [
  "contract_sum_usd",
  "land_cost_usd",
  "hard_cost_usd",
  "soft_cost_usd",
  "contingency_total_usd",
  "contingency_drawn_usd",
  "change_orders_approved_usd",
  "change_orders_pending_usd",
  "equity_committed_usd",
  "debt_committed_usd",
  "ld_per_day_usd",
  "carry_cost_per_day_usd",
  "baseline_start",
  "baseline_substantial_completion",
  "forecast_substantial_completion",
  "loan_maturity",
] as const;

const num = (v: unknown) => Number(v ?? 0) || 0;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

export async function fetchProjectFinance(projectId: number): Promise<ProjectFinance | null> {
  const { data, error } = await supabase
    .from("projects")
    .select(FINANCE_COLUMNS.join(","))
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as unknown as Record<string, unknown>;
  return {
    contract_sum_usd: num(r["contract_sum_usd"]),
    land_cost_usd: num(r["land_cost_usd"]),
    hard_cost_usd: num(r["hard_cost_usd"]),
    soft_cost_usd: num(r["soft_cost_usd"]),
    contingency_total_usd: num(r["contingency_total_usd"]),
    contingency_drawn_usd: num(r["contingency_drawn_usd"]),
    change_orders_approved_usd: num(r["change_orders_approved_usd"]),
    change_orders_pending_usd: num(r["change_orders_pending_usd"]),
    equity_committed_usd: num(r["equity_committed_usd"]),
    debt_committed_usd: num(r["debt_committed_usd"]),
    ld_per_day_usd: num(r["ld_per_day_usd"]),
    carry_cost_per_day_usd: num(r["carry_cost_per_day_usd"]),
    baseline_start: str(r["baseline_start"]),
    baseline_substantial_completion: str(r["baseline_substantial_completion"]),
    forecast_substantial_completion: str(r["forecast_substantial_completion"]),
    loan_maturity: str(r["loan_maturity"]),
  };
}

/* --------------------------------------------------------------- helpers */

export const usd = (v: number | null): string =>
  v === null
    ? "—"
    : Math.abs(v) >= 1_000_000
      ? `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 1 : 2)}M`
      : `$${Math.round(v).toLocaleString("en-US")}`;

export const pct = (v: number | null): string => (v === null ? "—" : `${Math.round(v)}%`);

const dayMs = 86_400_000;

export function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const d = (Date.parse(b) - Date.parse(a)) / dayMs;
  return Number.isFinite(d) ? Math.round(d) : null;
}

export interface FinanceDerived {
  totalCost: number;
  capitalCommitted: number;
  contingencyRemaining: number;
  contingencyBurnPct: number | null;
  coPct: number | null;
  /** Days the forecast completion sits beyond the baseline. Negative = ahead. */
  slipDays: number | null;
  /** Direct cost of that slip: liquidated damages plus carry. */
  slipCostUsd: number | null;
  /** Committed capital less total cost plus pending change orders. */
  fundingGapUsd: number | null;
  /** Days between forecast completion and loan maturity. Negative = past maturity. */
  maturityHeadroomDays: number | null;
}

export function deriveFinance(f: ProjectFinance | null): FinanceDerived | null {
  if (!f) return null;
  const totalCost = f.land_cost_usd + f.hard_cost_usd + f.soft_cost_usd;
  const capitalCommitted = f.equity_committed_usd + f.debt_committed_usd;
  const contingencyRemaining = f.contingency_total_usd - f.contingency_drawn_usd;
  const slipDays = daysBetween(
    f.baseline_substantial_completion,
    f.forecast_substantial_completion,
  );
  const slipCostUsd =
    slipDays === null ? null : Math.max(0, slipDays) * (f.ld_per_day_usd + f.carry_cost_per_day_usd);
  const exposure = totalCost + f.change_orders_pending_usd + (slipCostUsd ?? 0);
  return {
    totalCost,
    capitalCommitted,
    contingencyRemaining,
    contingencyBurnPct:
      f.contingency_total_usd > 0
        ? (f.contingency_drawn_usd / f.contingency_total_usd) * 100
        : null,
    coPct:
      f.contract_sum_usd > 0
        ? ((f.change_orders_approved_usd + f.change_orders_pending_usd) / f.contract_sum_usd) * 100
        : null,
    slipDays,
    slipCostUsd,
    fundingGapUsd: capitalCommitted > 0 ? capitalCommitted - exposure : null,
    maturityHeadroomDays: daysBetween(f.forecast_substantial_completion, f.loan_maturity),
  };
}

export const hasFinance = (f: ProjectFinance | null): boolean =>
  Boolean(
    f &&
      (f.contract_sum_usd > 0 ||
        f.hard_cost_usd > 0 ||
        f.baseline_substantial_completion ||
        f.equity_committed_usd > 0),
  );
