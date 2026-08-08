import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CzHeader } from "@/components/cz/header";
import { SHead } from "@/components/cz/shead";
import { CzButton, Gate, Modal } from "@/components/cz/primitives";
import { supabase } from "@/integrations/supabase/client";
import {
  ACQUISITION_STAGES,
  EXPANSION_STAGES,
  LOSS_REASONS,
  OPP_STAGES,
  STAGE_EXIT,
  STAGE_MEANING,
  daysInStage,
  expansionConversion,
  fetchCapacity,
  fetchOpportunities,
  forecast,
  isOpen,
  isRevenueDeal,
  totals,
  usd,
  isOverdue,
  importOpportunitiesCsv,
  fetchReviewerDaysPerMonth,
  OPPORTUNITY_CSV_COLUMNS,
  type CapacityRow,
  type OppStage,
  type Opportunity,
} from "@/lib/claimzero/pipeline";
import { parseCsv } from "@/lib/claimzero/controls";
import { CommercialOnly } from "@/components/cz/commercial-only";

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — ClaimZero Business Operations" },
      {
        name: "description",
        content:
          "The opportunity layer before Client: acquisition and expansion funnels, both revenue lines held separately, source attribution, coded loss reasons and a reviewer-capacity line on every forecast month.",
      },
      { property: "og:title", content: "Pipeline — ClaimZero Business Operations" },
      {
        property: "og:description",
        content:
          "Two funnels, two revenue lines, and a capacity-aware forecast — the constraint modelled, not assumed away.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuardedPipeline,
});

const STAGE_TINT: Record<OppStage, string> = {
  IDENTIFIED: "var(--cz-ink-3)",
  CONTACTED: "var(--cz-ink-3)",
  MET: "var(--cz-accent)",
  DEMO: "var(--cz-accent)",
  PROPOSAL: "var(--cz-warn)",
  ENGAGED: "var(--cz-good)",
  DELIVERED: "var(--cz-good)",
  MONITORING: "var(--cz-good)",
  LOST: "var(--cz-critical)",
  DORMANT: "var(--cz-ink-3)",
};

function Kpi({
  label,
  value,
  note,
  tint,
}: {
  label: string;
  value: string;
  note: string;
  tint?: string;
}) {
  return (
    <div className="rounded-[10px] border border-cz-rule bg-cz-surface px-3.5 py-3">
      <div className="cz-eyebrow text-[9px] tracking-[0.18em]">{label}</div>
      <div
        className="cz-figure mt-1 text-[22px] leading-none font-bold"
        style={tint ? { color: tint } : undefined}
      >
        {value}
      </div>
      <div className="mt-1.5 font-cz-serif text-[11.5px] text-cz-ink-3 italic">{note}</div>
    </div>
  );
}

function Pipeline() {
  const [rows, setRows] = useState<Opportunity[]>([]);
  const [cap, setCap] = useState<CapacityRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Opportunity | null>(null);
  const [stageDraft, setStageDraft] = useState<OppStage>("IDENTIFIED");
  const [lossDraft, setLossDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [daysPerMonth, setDaysPerMonth] = useState(20);
  const [fSegment, setFSegment] = useState("");
  const [fSource, setFSource] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      const [o, c, d] = await Promise.all([
        fetchOpportunities(),
        fetchCapacity(),
        fetchReviewerDaysPerMonth(),
      ]);
      setRows(o);
      setCap(c);
      setDaysPerMonth(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load the pipeline");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const segments = useMemo(
    () => [...new Set(rows.map((o) => o.segment).filter(Boolean))].sort(),
    [rows],
  );
  const sources = useMemo(
    () => [...new Set(rows.map((o) => o.source).filter(Boolean))].sort(),
    [rows],
  );
  const owners = useMemo(
    () => [...new Set(rows.map((o) => o.owner).filter(Boolean))].sort(),
    [rows],
  );
  const filtered = useMemo(
    () =>
      rows.filter(
        (o) =>
          (!fSegment || o.segment === fSegment) &&
          (!fSource || o.source === fSource) &&
          (!fOwner || o.owner === fOwner),
      ),
    [rows, fSegment, fSource, fOwner],
  );

  const onImport = async (file: File) => {
    setImportMsg("Importing…");
    try {
      const res = await importOpportunitiesCsv(await file.text(), parseCsv);
      setImportMsg(
        `${res.rows} opportunities upserted${res.errors.length ? ` · ${res.errors.length} rejected` : ""}`,
      );
      await load();
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "Import failed");
    }
  };

  const revenueDeals = useMemo(() => rows.filter(isRevenueDeal), [rows]);
  const acquisition = useMemo(
    () =>
      revenueDeals.filter((o) =>
        (ACQUISITION_STAGES as readonly string[]).includes(o.stage),
      ),
    [revenueDeals],
  );
  const expansion = useMemo(
    () =>
      revenueDeals.filter((o) => (EXPANSION_STAGES as readonly string[]).includes(o.stage)),
    [revenueDeals],
  );
  const acq = totals(acquisition);
  const exp = totals(expansion);
  const conv = expansionConversion(revenueDeals);
  const months = useMemo(() => forecast(rows, cap, daysPerMonth), [rows, cap, daysPerMonth]);
  const openDays = revenueDeals.filter(isOpen).reduce((a, o) => a + o.reviewer_days_required, 0);
  const lost = rows.filter((o) => o.stage === "LOST");
  const channel = rows.filter((o) => o.channel_deal);
  const outOfScope = rows.filter((o) => o.out_of_scope);
  const overMonths = months.filter((m) => m.over);

  const lossTally = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of lost) m.set(o.loss_reason_code || o.loss_reason || "UNCODED", (m.get(o.loss_reason_code || o.loss_reason || "UNCODED") ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [lost]);

  const openDetail = (o: Opportunity) => {
    setOpen(o);
    setStageDraft(o.stage);
    setLossDraft(o.loss_reason_code ?? o.loss_reason ?? "");
  };

  const saveStage = async () => {
    if (!open) return;
    if (stageDraft === "LOST" && !lossDraft) return;
    setSaving(true);
    const { error: err } = await supabase
      .from("opportunities")
      .update({
        stage: stageDraft,
        stage_entered: new Date().toISOString().slice(0, 10),
        loss_reason: stageDraft === "LOST" ? lossDraft : "",
        loss_reason_code: stageDraft === "LOST" ? lossDraft : null,
      })
      .eq("id", open.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setOpen(null);
    await load();
  };

  const byStage = (s: OppStage) => filtered.filter((o) => o.stage === s);

  return (
    <div className="min-h-screen">
      <CzHeader
        crumb={
          <>
            Pipeline › <b className="text-cz-ink-1">Opportunities</b>
          </>
        }
      />
      <SHead
        title="Pipeline"
        note="the layer before Client — two funnels, two revenue lines, and the reviewer constraint held beside the forecast"
      />

      <div className="grid gap-3.5 px-5 pt-3.5 pb-10">
        {error ? (
          <div
            className="rounded-[10px] border px-3.5 py-2.5 text-[12.5px]"
            style={{ borderColor: "var(--cz-critical)", color: "var(--cz-critical)" }}
          >
            {error}
          </div>
        ) : null}

        {/* Filters + import */}
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-cz-rule bg-cz-surface px-3.5 py-2.5">
          <span className="cz-eyebrow text-[9px] tracking-[0.18em]">Filter</span>
          {(
            [
              ["Segment", fSegment, setFSegment, segments],
              ["Source", fSource, setFSource, sources],
              ["Owner", fOwner, setFOwner, owners],
            ] as const
          ).map(([label, value, set, opts]) => (
            <select
              key={label}
              value={value}
              onChange={(e) => set(e.target.value)}
              className="rounded-[5px] border border-cz-grid bg-cz-bg px-2 py-1 text-[12px] text-cz-ink-1 outline-none focus:border-cz-accent"
            >
              <option value="">All {label.toLowerCase()}s</option>
              {opts.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ))}
          <span className="font-cz-mono text-[10.5px] text-cz-ink-3">
            {filtered.length} of {rows.length}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {importMsg ? (
              <span className="font-cz-mono text-[10.5px] text-cz-ink-3">{importMsg}</span>
            ) : null}
            <CzButton
              onClick={() => {
                const csv = OPPORTUNITY_CSV_COLUMNS.join(",") + "\n";
                const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                const a = document.createElement("a");
                a.href = url;
                a.download = "claimzero_opportunities_template.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              ↓ CSV template
            </CzButton>
            <label className="cursor-pointer rounded-[6px] border border-cz-grid px-2.5 py-1.5 text-[12px] text-cz-ink-2 hover:border-cz-accent">
              ↑ Import opportunities
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onImport(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>

        {/* KPI strip — the two funnels never summed into one number */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Acquisition — weighted"
            value={usd(Math.round(acq.weightedAssessment))}
            note={`${acq.count} open opportunities · ${usd(acq.assessment)} gross assessment fees`}
          />
          <Kpi
            label="Expansion — monitoring ARR"
            value={usd(Math.round(exp.arr))}
            note={`${exp.count} accounts delivered or monitoring · recurring, never summed with fees`}
            tint="var(--cz-good)"
          />
          <Kpi
            label="Assessment → monitoring"
            value={conv.pct === null ? "—" : `${conv.pct}%`}
            note={`${conv.converted} of ${conv.reachedDelivery} delivered assessments converted`}
            tint={conv.pct !== null && conv.pct < 60 ? "var(--cz-warn-ink)" : "var(--cz-good)"}
          />
          <Kpi
            label="Reviewer load — open book"
            value={`${openDays} days`}
            note={
              overMonths.length
                ? `${overMonths.length} forecast month${overMonths.length > 1 ? "s" : ""} over capacity`
                : "Every forecast month inside capacity"
            }
            tint={overMonths.length ? "var(--cz-critical)" : "var(--cz-good)"}
          />
        </div>

        {overMonths.length ? (
          <Gate>
            ⏸ <b>Capacity constraint:</b> {overMonths.map((m) => m.label).join(", ")} would consume
            more reviewer-days than exist. Delivery fails before revenue does — reschedule the close
            dates or add reviewer capacity before working these deals harder.
          </Gate>
        ) : null}

        {/* Forecast with the capacity line beside it */}
        <section className="rounded-[10px] border border-cz-rule bg-cz-surface">
          <div className="border-b border-cz-grid px-3.5 py-2.5">
            <div className="cz-eyebrow text-[10px] tracking-[0.18em]">
              Forecast & reviewer capacity
            </div>
            <div className="mt-0.5 font-cz-serif text-[11.5px] text-cz-ink-3 italic">
              No weighted forecast is shown without the capacity line beside it.
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="cz-eyebrow text-left">
                  <th className="border-b border-cz-grid px-3 py-2">Month</th>
                  <th className="border-b border-cz-grid px-3 py-2">Deals</th>
                  <th className="border-b border-cz-grid px-3 py-2">Weighted fees</th>
                  <th className="border-b border-cz-grid px-3 py-2">Weighted ARR</th>
                  <th className="border-b border-cz-grid px-3 py-2">Reviewer-days required</th>
                  <th className="border-b border-cz-grid px-3 py-2">Available</th>
                  <th className="border-b border-cz-grid px-3 py-2">Load</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => {
                  const pct = m.reviewerDaysAvailable
                    ? Math.round((m.reviewerDaysRequired / m.reviewerDaysAvailable) * 100)
                    : 0;
                  const tint = m.over ? "var(--cz-critical)" : "var(--cz-good)";
                  return (
                    <tr
                      key={m.month}
                      style={
                        m.over
                          ? {
                              background:
                                "color-mix(in srgb, var(--cz-critical) 12%, transparent)",
                            }
                          : undefined
                      }
                    >
                      <td className="border-b border-cz-grid px-3 py-1.5 font-bold">
                        {m.label}
                        {m.over ? (
                          <div
                            className="font-cz-mono text-[9.5px] font-bold"
                            style={{ color: "var(--cz-critical)" }}
                          >
                            DELIVERY CAPACITY EXCEEDED
                          </div>
                        ) : null}
                      </td>
                      <td className="cz-figure border-b border-cz-grid px-3 py-1.5">{m.deals}</td>
                      <td className="cz-figure border-b border-cz-grid px-3 py-1.5">
                        {usd(Math.round(m.weightedAssessment))}
                      </td>
                      <td className="cz-figure border-b border-cz-grid px-3 py-1.5 text-cz-ink-2">
                        {usd(Math.round(m.weightedArr))}
                      </td>
                      <td
                        className="cz-figure border-b border-cz-grid px-3 py-1.5"
                        style={{ color: tint }}
                      >
                        {m.reviewerDaysRequired}
                      </td>
                      <td className="cz-figure border-b border-cz-grid px-3 py-1.5 text-cz-ink-2">
                        {m.reviewerDaysAvailable || "—"}
                      </td>
                      <td className="border-b border-cz-grid px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-cz-grid">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${Math.min(100, pct)}%`,
                                background: tint,
                              }}
                            />
                          </div>
                          <span className="font-cz-mono text-[10.5px]" style={{ color: tint }}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {months.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-cz-ink-3">
                      {loading ? "Loading…" : "No forecastable opportunities."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {/* Stage board */}
        <section className="rounded-[10px] border border-cz-rule bg-cz-surface">
          <div className="border-b border-cz-grid px-3.5 py-2.5">
            <div className="cz-eyebrow text-[10px] tracking-[0.18em]">
              Acquisition funnel → expansion funnel
            </div>
            <div className="mt-0.5 font-cz-serif text-[11.5px] text-cz-ink-3 italic">
              Identified through Engaged produces a one-time assessment fee. Delivered through
              Monitoring is where the business compounds.
            </div>
          </div>
          <div className="grid gap-2.5 p-3.5 md:grid-cols-4 xl:grid-cols-8">
            {OPP_STAGES.map((s) => {
              const list = byStage(s);
              const t = totals(list);
              const isExpansion = (EXPANSION_STAGES as readonly string[]).includes(s);
              return (
                <div
                  key={s}
                  className="rounded-[8px] border border-cz-grid bg-cz-bg p-2"
                  style={
                    isExpansion
                      ? { borderColor: "color-mix(in srgb, var(--cz-good) 45%, transparent)" }
                      : undefined
                  }
                >
                  <div
                    className="cz-eyebrow text-[9px] tracking-[0.14em]"
                    style={{ color: STAGE_TINT[s] }}
                  >
                    {s}
                  </div>
                  <div className="cz-figure text-[18px] leading-tight font-bold">{list.length}</div>
                  <div className="font-cz-mono text-[9.5px] text-cz-ink-3">
                    {usd(isExpansion ? t.arr : t.assessment)}
                  </div>
                  <div
                    className="mt-1 border-t border-cz-grid pt-1 font-cz-serif text-[10.5px] leading-snug text-cz-ink-3 italic"
                    title={`Exit: ${STAGE_EXIT[s]}`}
                  >
                    {STAGE_MEANING[s]}
                  </div>
                  <div className="mt-1.5 grid gap-1">
                    {list.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => openDetail(o)}
                        className="rounded-[5px] border border-cz-grid bg-cz-surface px-1.5 py-1 text-left text-[11px] hover:border-cz-accent"
                        style={
                          isOverdue(o)
                            ? { borderColor: "var(--cz-critical)" }
                            : undefined
                        }
                      >
                        <div className="font-bold">{o.org_name}</div>
                        <div className="text-[10px] text-cz-ink-2">{o.project_name || "—"}</div>
                        <div className="font-cz-mono text-[9.5px] text-cz-ink-3">
                          {daysInStage(o)}d in stage · {o.probability_pct}% ·{" "}
                          {o.reviewer_days_required}rd
                        </div>
                        <div className="mt-0.5 grid grid-cols-2 gap-1 font-cz-mono text-[9.5px]">
                          <span title="Assessment fee">FEE {usd(o.assessment_fee_usd)}</span>
                          <span title="Monitoring ARR" style={{ color: "var(--cz-good)" }}>
                            ARR {usd(o.monitoring_arr_usd)}
                          </span>
                        </div>
                        <div className="mt-0.5 border-t border-cz-grid pt-0.5 text-[9.5px] text-cz-ink-3">
                          {o.next_action || "No next action"}
                          {o.next_action_date ? (
                            <span
                              className="ml-1 font-cz-mono"
                              style={
                                isOverdue(o) ? { color: "var(--cz-critical)" } : undefined
                              }
                            >
                              {isOverdue(o) ? "⚑ " : ""}
                              {o.next_action_date}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Full register */}
        <section className="overflow-x-auto rounded-[10px] border border-cz-rule bg-cz-surface">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="cz-eyebrow text-left">
                <th className="border-b border-cz-grid px-3 py-2">ID</th>
                <th className="border-b border-cz-grid px-3 py-2">Organisation</th>
                <th className="border-b border-cz-grid px-3 py-2">Contact</th>
                <th className="border-b border-cz-grid px-3 py-2">Source</th>
                <th className="border-b border-cz-grid px-3 py-2">Stage</th>
                <th className="border-b border-cz-grid px-3 py-2">Days</th>
                <th className="border-b border-cz-grid px-3 py-2">Fee</th>
                <th className="border-b border-cz-grid px-3 py-2">ARR</th>
                <th className="border-b border-cz-grid px-3 py-2">P</th>
                <th className="border-b border-cz-grid px-3 py-2">Rev-days</th>
                <th className="border-b border-cz-grid px-3 py-2">Next action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className="cursor-pointer hover:bg-white/5"
                  onClick={() => openDetail(o)}
                >
                  <td className="border-b border-cz-grid px-3 py-1.5 font-cz-mono text-[10.5px] text-cz-ink-3">
                    {o.opportunity_id}
                  </td>
                  <td className="border-b border-cz-grid px-3 py-1.5 font-bold">
                    {o.org_name}
                    {o.channel_deal ? (
                      <span
                        className="ml-1.5 font-cz-mono text-[9px]"
                        style={{ color: "var(--cz-accent)" }}
                      >
                        CHANNEL
                      </span>
                    ) : null}
                    {o.out_of_scope ? (
                      <span
                        className="ml-1.5 font-cz-mono text-[9px]"
                        style={{ color: "var(--cz-critical)" }}
                      >
                        OUT OF SCOPE
                      </span>
                    ) : null}
                  </td>
                  <td className="border-b border-cz-grid px-3 py-1.5 text-cz-ink-2">
                    {o.contact_name || "—"}
                  </td>
                  <td className="border-b border-cz-grid px-3 py-1.5 font-cz-mono text-[10.5px] text-cz-ink-3">
                    {o.source}
                  </td>
                  <td
                    className="border-b border-cz-grid px-3 py-1.5 font-cz-mono text-[10.5px]"
                    style={{ color: STAGE_TINT[o.stage] }}
                  >
                    {o.stage}
                  </td>
                  <td className="cz-figure border-b border-cz-grid px-3 py-1.5 text-cz-ink-2">
                    {daysInStage(o)}
                  </td>
                  <td className="cz-figure border-b border-cz-grid px-3 py-1.5">
                    {usd(o.assessment_fee_usd)}
                  </td>
                  <td className="cz-figure border-b border-cz-grid px-3 py-1.5 text-cz-ink-2">
                    {usd(o.monitoring_arr_usd)}
                  </td>
                  <td className="cz-figure border-b border-cz-grid px-3 py-1.5 text-cz-ink-2">
                    {o.probability_pct}%
                  </td>
                  <td className="cz-figure border-b border-cz-grid px-3 py-1.5 text-cz-ink-2">
                    {o.reviewer_days_required || "—"}
                  </td>
                  <td className="border-b border-cz-grid px-3 py-1.5 text-cz-ink-2">
                    {o.next_action || "—"}
                    {o.next_action_date ? (
                      <span className="ml-1.5 font-cz-mono text-[10px] text-cz-ink-3">
                        {o.next_action_date}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-4 text-center text-cz-ink-3">
                    {loading ? "Loading…" : "No opportunities yet."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        {/* Loss reasons + separated channel reporting */}
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="rounded-[10px] border border-cz-rule bg-cz-surface p-3.5">
            <div className="cz-eyebrow text-[10px] tracking-[0.18em]">Loss reasons</div>
            <div className="mt-0.5 font-cz-serif text-[11.5px] text-cz-ink-3 italic">
              No opportunity enters Lost without a coded reason. If one reason accumulates, the
              positioning is wrong and this is where it shows first.
            </div>
            <div className="mt-2.5 grid gap-1.5">
              {lossTally.map(([reason, n]) => (
                <div
                  key={reason}
                  className="flex items-center justify-between border-b border-cz-grid pb-1 font-cz-mono text-[11px]"
                >
                  <span style={{ color: "var(--cz-critical)" }}>{reason.replace(/_/g, " ")}</span>
                  <span className="cz-figure">{n}</span>
                </div>
              ))}
              {lossTally.length === 0 ? (
                <div className="text-[12px] text-cz-ink-3">No losses recorded.</div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[10px] border border-cz-rule bg-cz-surface p-3.5">
            <div className="cz-eyebrow text-[10px] tracking-[0.18em]">
              Reported separately — not project revenue
            </div>
            <div className="mt-0.5 font-cz-serif text-[11.5px] text-cz-ink-3 italic">
              Channel and lender-mandate relationships produce project deals downstream; they are
              never weighted into the project revenue lines above. Public agencies are out of scope.
            </div>
            <div className="mt-2.5 grid gap-1.5 text-[12px]">
              {[...channel, ...outOfScope].map((o) => (
                <div key={o.id} className="flex items-center justify-between border-b border-cz-grid pb-1">
                  <span className="font-bold">{o.org_name}</span>
                  <span
                    className="font-cz-mono text-[10px]"
                    style={{ color: o.out_of_scope ? "var(--cz-critical)" : "var(--cz-accent)" }}
                  >
                    {o.out_of_scope ? "OUT OF SCOPE" : "CHANNEL"} · {o.stage}
                  </span>
                </div>
              ))}
              {channel.length + outOfScope.length === 0 ? (
                <div className="text-cz-ink-3">Nothing tagged.</div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <Modal open={open !== null} onClose={() => setOpen(null)}>
        {open ? (
          <>
            <h2 className="font-cz-sans text-[16px] font-bold">{open.org_name}</h2>
            <div className="mt-0.5 mb-3 font-cz-mono text-[11px] text-cz-ink-3">
              {open.opportunity_id} · {open.org_type} · {open.segment}
            </div>
            <div className="grid gap-2 text-[12.5px]">
              <div>
                <span className="cz-eyebrow mr-2 text-[9px]">Contact</span>
                {open.contact_name || "—"}
                {open.contact_title ? `, ${open.contact_title}` : ""}
                {open.email ? (
                  <span className="ml-2 font-cz-mono text-[10.5px] text-cz-ink-3">
                    {open.email} · {open.phone}
                  </span>
                ) : null}
              </div>
              <div>
                <span className="cz-eyebrow mr-2 text-[9px]">Source</span>
                {open.source} — {open.source_detail}
              </div>
              <div>
                <span className="cz-eyebrow mr-2 text-[9px]">Project</span>
                {open.project_name || "—"} · {usd(open.project_value_usd)}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="cz-eyebrow text-[9px]">Assessment fee</div>
                  <div className="cz-figure">{usd(open.assessment_fee_usd)}</div>
                </div>
                <div>
                  <div className="cz-eyebrow text-[9px]">Monitoring ARR</div>
                  <div className="cz-figure" style={{ color: "var(--cz-good)" }}>
                    {usd(open.monitoring_arr_usd)}
                  </div>
                </div>
                <div>
                  <div className="cz-eyebrow text-[9px]">Reviewer-days</div>
                  <div className="cz-figure">{open.reviewer_days_required}</div>
                </div>
              </div>
              <div>
                <span className="cz-eyebrow mr-2 text-[9px]">Next action</span>
                {open.next_action || "—"}{" "}
                <span className="font-cz-mono text-[10.5px] text-cz-ink-3">
                  {open.next_action_date ?? ""}
                </span>
              </div>
              <div className="font-cz-serif text-[12px] text-cz-ink-2 italic">{open.notes}</div>
            </div>

            <div className="mt-3.5 grid gap-2 border-t border-cz-grid pt-3">
              <label className="grid gap-1">
                <span className="cz-eyebrow">Stage</span>
                <select
                  value={stageDraft}
                  onChange={(e) => setStageDraft(e.target.value as OppStage)}
                  className="rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 text-[13px] text-cz-ink-1 outline-none focus:border-cz-accent"
                >
                  {[...OPP_STAGES, "LOST", "DORMANT"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <span className="font-cz-serif text-[11.5px] text-cz-ink-3 italic">
                  Exit condition: {STAGE_EXIT[stageDraft]}
                </span>
              </label>
              {stageDraft === "LOST" ? (
                <label className="grid gap-1">
                  <span className="cz-eyebrow">Loss reason — required</span>
                  <select
                    value={lossDraft}
                    onChange={(e) => setLossDraft(e.target.value)}
                    className="rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 text-[13px] text-cz-ink-1 outline-none focus:border-cz-accent"
                  >
                    <option value="">Select a coded reason…</option>
                    {LOSS_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <div className="mt-3.5 flex justify-end gap-2">
              <CzButton onClick={() => setOpen(null)}>Close</CzButton>
              <CzButton
                primary
                disabled={saving || (stageDraft === "LOST" && !lossDraft)}
                onClick={() => void saveStage()}
              >
                Save stage →
              </CzButton>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}

function GuardedPipeline() {
  return (
    <CommercialOnly>
      <Pipeline />
    </CommercialOnly>
  );
}
