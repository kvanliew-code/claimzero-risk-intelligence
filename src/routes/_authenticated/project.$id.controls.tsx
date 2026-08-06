import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CzButton } from "@/components/cz/primitives";
import { ProjectHeaderStrip } from "./project.$id";
import { supabase } from "@/integrations/supabase/client";
import {
  CONTROL_STATUSES,
  CRITICALITIES,
  CRITICALITY_COLOR,
  DOMAINS,
  IRREVERSIBILITIES,
  IRREVERSIBILITY_COLOR,
  STATUS_COLOR,
  STATUS_LABEL,
  appliesTo,
  ensureInstances,
  evaluateEscalations,
  fetchEscalationRules,
  fetchRegister,
  fetchStages,
  stageGate,
  stageNumberFor,
  tierFor,
  weightsFor,
  type ControlInstance,
  type ControlSpec,
  type ControlStatus,
  type Criticality,
  type EscalationRule,
  type Irreversibility,
  type StageConfig,
} from "@/lib/claimzero/controls";

const api = getRouteApi("/_authenticated/project/$id");

export const Route = createFileRoute("/_authenticated/project/$id/controls")({
  head: () => ({
    meta: [
      { title: "Control Register — ClaimZero Project" },
      {
        name: "description",
        content:
          "Stage- and tier-scoped control instances grouped by family, with stage-gate exit criteria and evidence verification.",
      },
      { property: "og:title", content: "Control Register — ClaimZero Project" },
      {
        property: "og:description",
        content: "Stage- and tier-scoped control instances with stage-gate exit criteria.",
      },
    ],
  }),
  component: Controls,
});

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-2.5 py-[3px] font-cz-mono text-[10.5px] tracking-[0.04em] transition-colors"
      style={
        active
          ? {
              borderColor: "var(--cz-accent-solid)",
              background: "color-mix(in srgb, var(--cz-accent) 16%, transparent)",
              color: "var(--cz-ink-1)",
            }
          : { borderColor: "var(--cz-grid)", color: "var(--cz-ink-3)" }
      }
    >
      {children}
    </button>
  );
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="rounded-[3px] border px-1.5 py-[1px] font-cz-mono text-[9.5px] tracking-[0.05em]"
      style={{ borderColor: color, color }}
    >
      {label}
    </span>
  );
}

function Controls() {
  const { project } = api.useLoaderData();
  const [register, setRegister] = useState<ControlSpec[]>([]);
  const [stages, setStages] = useState<StageConfig[]>([]);
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [instances, setInstances] = useState<ControlInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fStatus, setFStatus] = useState<ControlStatus | "All">("All");
  const [fOwner, setFOwner] = useState<string>("All");
  const [fDomain, setFDomain] = useState<string>("All");
  const [fCrit, setFCrit] = useState<Criticality | "All">("All");
  const [fIrr, setFIrr] = useState<Irreversibility | "All">("All");
  const [open, setOpen] = useState<string | null>(null);

  const stageNumber = stageNumberFor(project);
  const tier = tierFor(project);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [reg, stg, esc] = await Promise.all([
          fetchRegister(),
          fetchStages(),
          fetchEscalationRules(),
        ]);
        const inst = await ensureInstances(project, reg);
        if (cancelled) return;
        setRegister(reg);
        setStages(stg);
        setRules(esc);
        setInstances(inst);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load the register");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project]);

  const instMap = useMemo(() => new Map(instances.map((i) => [i.control_id, i])), [instances]);
  const applicable = useMemo(
    () => register.filter((c) => appliesTo(c, stageNumber, tier)),
    [register, stageNumber, tier],
  );

  const owners = useMemo(
    () => ["All", ...Array.from(new Set(applicable.map((c) => c.primary_owner_role))).sort()],
    [applicable],
  );

  const currentStage = stages.find((s) => s.stage_number === stageNumber);
  const gate = currentStage
    ? stageGate(currentStage, register, instMap, stageNumber, tier)
    : undefined;
  const escalations = useMemo(
    () => evaluateEscalations(rules, applicable, instMap, gate?.completeness ?? 0),
    [rules, applicable, instMap, gate?.completeness],
  );

  const shown = applicable.filter((c) => {
    const st = instMap.get(c.control_id)?.status;
    if (fStatus !== "All" && st !== fStatus) return false;
    if (fOwner !== "All" && c.primary_owner_role !== fOwner) return false;
    if (fDomain !== "All" && c.domain !== fDomain) return false;
    if (fCrit !== "All" && c.criticality !== fCrit) return false;
    if (fIrr !== "All" && c.irreversibility !== fIrr) return false;
    return true;
  });

  const families = useMemo(() => {
    const map = new Map<string, ControlSpec[]>();
    for (const c of shown) {
      const key = `${c.family_code} · ${c.family_name}`;
      (map.get(key) ?? map.set(key, []).get(key)!).push(c);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [shown]);

  const update = async (controlId: string, patch: Partial<ControlInstance>) => {
    setInstances((prev) =>
      prev.map((i) => (i.control_id === controlId ? { ...i, ...patch } : i)),
    );
    await supabase
      .from("project_controls")
      .update(patch as never)
      .eq("project_id", project.id)
      .eq("control_id", controlId);
  };

  const weights = weightsFor(currentStage);

  return (
    <>
      <ProjectHeaderStrip />
      <div className="px-5 py-3.5 pb-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="cz-eyebrow">Control Register</div>
            <h1 className="font-cz-sans text-[19px] font-bold">
              Stage {stageNumber} · {currentStage?.stage_name ?? "—"}{" "}
              <span className="font-cz-mono text-[11px] text-cz-ink-3">Tier {tier}</span>
            </h1>
          </div>
          <div className="font-cz-mono text-[10.5px] text-cz-ink-3">
            {applicable.length} controls applicable · {instances.length} instances generated
          </div>
        </div>

        {loading && <p className="mt-4 font-cz-serif text-cz-ink-2">Generating control instances…</p>}
        {error && (
          <p className="mt-4 font-cz-mono text-[11.5px]" style={{ color: "var(--cz-critical)" }}>
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            {/* stage gate */}
            {gate && (
              <div
                className="mt-3.5 rounded-xl border p-4"
                style={{
                  borderColor: gate.ready ? "var(--cz-good)" : "var(--cz-warn)",
                  background: `color-mix(in srgb, ${gate.ready ? "var(--cz-good)" : "var(--cz-warn)"} 8%, transparent)`,
                }}
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <div
                    className="cz-eyebrow"
                    style={{ color: gate.ready ? "var(--cz-good)" : "var(--cz-warn)" }}
                  >
                    Stage gate: {gate.ready ? "COMPLETE-VERIFIED" : "CONDITIONAL — NOT READY"}
                  </div>
                  <div className="cz-figure text-[22px] font-bold">{gate.completeness}%</div>
                  <div className="font-cz-mono text-[10.5px] text-cz-ink-3">
                    {gate.verified} of {gate.applicable} stage controls Complete-Verified
                  </div>
                </div>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="cz-eyebrow text-[9px]">Exit criteria</div>
                    <ul className="mt-1 space-y-1 text-[12.5px] text-cz-ink-2">
                      {gate.stage.exit_criteria.map((c) => (
                        <li key={c}>· {c}</li>
                      ))}
                    </ul>
                  </div>
                  {gate.openItems.length > 0 && (
                    <div>
                      <div className="cz-eyebrow text-[9px]">Open items</div>
                      <ul className="mt-1 space-y-1 text-[12.5px] text-cz-ink-2">
                        {gate.openItems.map((o) => (
                          <li key={o.control_id}>
                            <span className="font-cz-mono text-[11px]">{o.control_id}</span> —{" "}
                            {o.requirement}{" "}
                            <span style={{ color: STATUS_COLOR[o.status] }}>({o.status})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* weights + escalations */}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-cz-rule bg-cz-surface px-3.5 py-3">
                <div className="cz-eyebrow text-[9px]">
                  Composite Risk Index weighting — stage {stageNumber}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-cz-mono text-[11px]">
                  {Object.entries(weights).map(([d, w]) => (
                    <span key={d}>
                      {d} <b className="text-cz-ink-1">{Math.round(w * 100)}%</b>
                    </span>
                  ))}
                </div>
                <div className="mt-1 font-cz-mono text-[10px] text-cz-ink-3">
                  Stored as configuration — editable in Settings.
                </div>
              </div>
              <div className="rounded-md border border-cz-rule bg-cz-surface px-3.5 py-3">
                <div className="cz-eyebrow text-[9px]">Escalations to the Weekly Top Ten</div>
                {escalations.length === 0 ? (
                  <div className="mt-1.5 text-[12.5px] text-cz-ink-2">
                    No configured escalation condition is currently met.
                  </div>
                ) : (
                  <ul className="mt-1.5 space-y-1 text-[12.5px] text-cz-ink-2">
                    {escalations.map((e) => (
                      <li key={e.rule.id}>
                        <b className="text-cz-ink-1">{e.rule.name}</b> — {e.hits.length} item
                        {e.hits.length === 1 ? "" : "s"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* filters */}
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
              <span className="cz-eyebrow mr-1 text-[9px]">Status</span>
              <Pill active={fStatus === "All"} onClick={() => setFStatus("All")}>
                all
              </Pill>
              {CONTROL_STATUSES.map((s) => (
                <Pill key={s} active={fStatus === s} onClick={() => setFStatus(s)}>
                  {STATUS_LABEL[s]}
                </Pill>
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="cz-eyebrow mr-1 text-[9px]">Owner</span>
              {owners.map((o) => (
                <Pill key={o} active={fOwner === o} onClick={() => setFOwner(o)}>
                  {o}
                </Pill>
              ))}
              <span className="cz-eyebrow mr-1 ml-3 text-[9px]">Domain</span>
              <Pill active={fDomain === "All"} onClick={() => setFDomain("All")}>
                all
              </Pill>
              {DOMAINS.map((d) => (
                <Pill key={d} active={fDomain === d} onClick={() => setFDomain(d)}>
                  {d}
                </Pill>
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="cz-eyebrow mr-1 text-[9px]">Criticality</span>
              <Pill active={fCrit === "All"} onClick={() => setFCrit("All")}>
                all
              </Pill>
              {CRITICALITIES.map((c) => (
                <Pill key={c} active={fCrit === c} onClick={() => setFCrit(c)}>
                  {c}
                </Pill>
              ))}
              <span className="cz-eyebrow mr-1 ml-3 text-[9px]">Irreversibility</span>
              <Pill active={fIrr === "All"} onClick={() => setFIrr("All")}>
                all
              </Pill>
              {IRREVERSIBILITIES.map((i) => (
                <Pill key={i} active={fIrr === i} onClick={() => setFIrr(i)}>
                  {i}
                </Pill>
              ))}
            </div>


            {/* families */}
            <div className="mt-3.5 space-y-3">
              {families.map(([family, specs]) => {
                const scored = specs.filter(
                  (s) => instMap.get(s.control_id)?.status !== "N/A",
                );
                const verified = scored.filter(
                  (s) => instMap.get(s.control_id)?.status === "COMPLETE_VERIFIED",
                ).length;
                return (
                  <div
                    key={family}
                    className="overflow-hidden rounded-md border border-cz-rule bg-cz-surface"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-cz-grid px-3.5 py-2">
                      <div className="font-cz-sans text-[13px] font-bold">{family}</div>
                      <div className="font-cz-mono text-[10.5px] text-cz-ink-3">
                        {verified}/{scored.length} Complete — Verified
                        {scored.length !== specs.length && ` · ${specs.length - scored.length} N/A`}
                      </div>
                    </div>

                    {specs.map((s) => {
                      const inst = instMap.get(s.control_id);
                      const status = inst?.status ?? "EVIDENCE_NOT_LOCATED";
                      const isOpen = open === s.control_id;
                      return (
                        <div key={s.control_id} className="border-b border-cz-grid last:border-b-0">
                          <button
                            type="button"
                            onClick={() => setOpen(isOpen ? null : s.control_id)}
                            className="flex w-full items-center gap-3 px-3.5 py-2 text-left hover:bg-white/5"
                          >
                            <span className="w-[104px] shrink-0 font-cz-mono text-[11px] text-cz-ink-3">
                              {s.control_id}
                            </span>
                            <span className="flex-1 text-[12.5px]">{s.title || s.requirement}</span>
                            <span className="hidden shrink-0 gap-1 md:flex">
                              <Badge color={CRITICALITY_COLOR[s.criticality]} label={s.criticality} />
                              <Badge
                                color={IRREVERSIBILITY_COLOR[s.irreversibility]}
                                label={`IRR ${s.irreversibility}`}
                              />
                            </span>
                            <span className="hidden font-cz-mono text-[10.5px] text-cz-ink-3 lg:inline">
                              {s.primary_owner_role} · {s.domain} · tier {s.min_tier}+
                            </span>
                            <span
                              className="w-[160px] shrink-0 text-right font-cz-mono text-[10.5px]"
                              style={{ color: STATUS_COLOR[status] }}
                            >
                              ● {STATUS_LABEL[status]}
                            </span>
                          </button>

                          {isOpen && (
                            <div className="border-t border-cz-grid bg-cz-bg/40 px-3.5 py-3">
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="text-[12.5px] text-cz-ink-2">
                                  <div className="cz-eyebrow text-[9px]">Expected evidence</div>
                                  <div>{s.expected_evidence}</div>
                                  <div className="cz-eyebrow mt-2 text-[9px]">
                                    Dependency / exposure
                                  </div>
                                  <div>{s.dependency}</div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-1.5">
                                    {CONTROL_STATUSES.map((st) => (
                                      <Pill
                                        key={st}
                                        active={status === st}
                                        onClick={() => void update(s.control_id, { status: st })}
                                      >
                                        {st}
                                      </Pill>
                                    ))}
                                  </div>
                                  <input
                                    placeholder="Evidence reference"
                                    defaultValue={inst?.evidence_ref ?? ""}
                                    onBlur={(e) =>
                                      void update(s.control_id, { evidence_ref: e.target.value })
                                    }
                                    className="w-full rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 text-[12.5px] outline-none focus:border-cz-accent"
                                  />
                                  <div className="flex gap-2">
                                    <input
                                      placeholder="Verified by"
                                      defaultValue={inst?.verified_by ?? ""}
                                      onBlur={(e) =>
                                        void update(s.control_id, { verified_by: e.target.value })
                                      }
                                      className="w-full rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 text-[12.5px] outline-none focus:border-cz-accent"
                                    />
                                    <input
                                      type="date"
                                      defaultValue={inst?.verified_date ?? ""}
                                      onChange={(e) =>
                                        void update(s.control_id, {
                                          verified_date: e.target.value || null,
                                        })
                                      }
                                      className="rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 text-[12.5px] outline-none focus:border-cz-accent"
                                    />
                                  </div>
                                  <textarea
                                    placeholder="Notes"
                                    defaultValue={inst?.notes ?? ""}
                                    onBlur={(e) => void update(s.control_id, { notes: e.target.value })}
                                    className="h-16 w-full rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 text-[12.5px] outline-none focus:border-cz-accent"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {families.length === 0 && (
                <p className="font-cz-serif text-cz-ink-2">No controls match these filters.</p>
              )}
            </div>

            <div className="mt-4">
              <CzButton onClick={() => window.print()}>▤ Print control register</CzButton>
            </div>
          </>
        )}
      </div>
    </>
  );
}
