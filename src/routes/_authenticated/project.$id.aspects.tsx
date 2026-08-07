import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CzButton, Gate, Modal, ReportH, ReportShell, Row3 } from "@/components/cz/primitives";
import { SourceBody } from "@/components/cz/source-drawer";
import { DEMO_FINDINGS, isDemoProject } from "@/lib/claimzero/demo";
import { ProjectHeaderStrip } from "./project.$id";
import { STATUS_COLOR, STATUS_LABEL, type ControlStatus } from "@/lib/claimzero/controls";
import { BAND_COLOR, scoreColorFor, weightOf, type AspectScore } from "@/lib/claimzero/scoring";
import { useProjectScoring } from "@/lib/claimzero/useProjectScoring";

const api = getRouteApi("/_authenticated/project/$id");

export const Route = createFileRoute("/_authenticated/project/$id/aspects")({
  head: () => ({
    meta: [
      { title: "Thirty Aspects — ClaimZero Project Risk" },
      {
        name: "description",
        content:
          "Every aspect scored from verified control evidence: weighted score, confidence band, penalties and the controls that produced the number.",
      },
      { property: "og:title", content: "Thirty Aspects — ClaimZero Project Risk" },
      {
        property: "og:description",
        content: "Aspect scores computed from the control register — never hand-entered.",
      },
    ],
  }),
  component: Aspects,
});

function Aspects() {
  const { project: p } = api.useLoaderData();
  const s = useProjectScoring(p);
  const [open, setOpen] = useState<AspectScore | null>(null);

  const familyToAspect = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of s.aspects)
      for (const f of a.family_codes.split(";")) m.set(f.trim(), a.aspect_id);
    return m;
  }, [s.aspects]);

  const contributing = useMemo(() => {
    if (!open) return [];
    return s.register
      .filter(
        (c) =>
          (c.aspect_id ?? familyToAspect.get(c.family_code)) === open.aspect_id &&
          c.stage_number <= s.stageNumber &&
          s.instanceMap.has(c.control_id),
      )
      .map((c) => ({
        spec: c,
        status: (s.instanceMap.get(c.control_id)?.status ?? "EVIDENCE_NOT_LOCATED") as ControlStatus,
      }))
      .sort((a, b) => weightOf(b.spec) - weightOf(a.spec))
      .slice(0, 40);
  }, [open, s.register, s.instanceMap, s.stageNumber, familyToAspect]);

  return (
    <>
      <ProjectHeaderStrip />
      <div className="px-5 pt-3.5 pb-10">
        <div className="mb-2 flex flex-wrap items-baseline gap-2.5">
          <h2 className="font-cz-sans text-[16px] font-bold">The Thirty Aspects</h2>
          <span className="text-[12px] text-cz-ink-3">
            0–100, higher is worse · weighted by criticality · only{" "}
            <b>Complete — Verified</b> earns credit · never shown without its confidence ·{" "}
            <b>click a panel for the controls behind the number</b>
          </span>
        </div>

        {s.loading && <p className="font-cz-serif text-cz-ink-2">Scoring from the control register…</p>}
        {s.error && (
          <p className="font-cz-mono text-[11.5px]" style={{ color: "var(--cz-critical)" }}>
            {s.error}
          </p>
        )}

        {!s.loading && !s.error && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-2.5">
            {s.scores.map((a) => {
              const color = scoreColorFor(a.score);
              const notApplicableYet = a.score === null;
              const insufficient = !notApplicableYet && a.band === "INSUFFICIENT";
              return (
                <div
                  key={a.aspect_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpen(a)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setOpen(a);
                  }}
                  className="cursor-pointer rounded-[10px] border border-cz-rule bg-cz-surface px-3.5 py-3 transition-colors hover:border-cz-accent"
                >
                  <h3 className="flex items-center gap-2 font-cz-sans text-[13px] font-bold">
                    <span className="font-cz-mono text-[11px] text-cz-ink-3">{a.aspect_id}</span>
                    {a.aspect_name}
                    <span className="cz-figure ml-auto text-[16px] font-bold" style={{ color }}>
                      {notApplicableYet
                        ? "—"
                        : insufficient
                          ? `${Math.max(0, a.score! - 10)}–${Math.min(100, a.score! + 10)}`
                          : a.score}
                    </span>
                  </h3>
                  <div className="mt-0.5 mb-2 text-[11.5px] text-cz-ink-3 italic">
                    {a.owner_question}
                  </div>
                  {notApplicableYet ? (
                    <div className="font-cz-mono text-[10.5px] text-cz-ink-3">
                      NOT_YET_APPLICABLE — no applicable control at stage {s.stageNumber}. Absence is
                      not zero.
                    </div>
                  ) : (
                    <>
                      <div className="my-2 h-1.5 overflow-hidden rounded bg-cz-grid">
                        <i
                          className="block h-full rounded"
                          style={{ width: `${a.score}%`, background: color }}
                        />
                      </div>
                      <div className="flex justify-between py-0.5 text-[12px] text-cz-ink-2">
                        <span>Verified / applicable controls</span>
                        <b className="cz-figure text-cz-ink-1">
                          {a.verified} / {a.controls - a.notApplicable}
                        </b>
                      </div>
                      <div className="flex justify-between py-0.5 text-[12px] text-cz-ink-2">
                        <span>Asserted, unverified</span>
                        <b className="cz-figure text-cz-ink-1">{a.assertedUnverified}</b>
                      </div>
                      {a.penalty > 0 && (
                        <div className="flex justify-between py-0.5 text-[12px] text-cz-ink-2">
                          <span>Penalties applied</span>
                          <b className="cz-figure" style={{ color: "var(--cz-critical)" }}>
                            +{a.penalty}
                          </b>
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2 border-t border-dashed border-cz-grid pt-2 font-cz-mono text-[10.5px]">
                        <span style={{ color: BAND_COLOR[a.band] }}>
                          CONFIDENCE {a.confidence}% · {a.band}
                        </span>
                        {insufficient && (
                          <span className="text-cz-ink-3">insufficient evidence — range shown</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={open !== null} onClose={() => setOpen(null)}>
        {open ? (
          <>
            <h2 className="font-cz-sans text-[16px] font-bold">
              {open.aspect_id} · {open.aspect_name}
            </h2>
            <div className="mt-0.5 mb-3.5 font-cz-mono text-[11px] text-cz-ink-3">
              {p.name} · stage {s.stageNumber} · tier {s.tier} · computed from the control register
            </div>
            {DEMO_FINDINGS.filter(
              (f) => isDemoProject(p.id) && f.aspect_id === open.aspect_id,
            ).map((f) => (
              <div
                key={f.id}
                className="mb-3.5 rounded-[8px] px-3 py-2.5"
                style={{
                  borderLeft: "3px solid var(--cz-critical)",
                  background: "color-mix(in srgb, var(--cz-critical) 8%, transparent)",
                }}
              >
                <div className="font-cz-mono text-[10px]" style={{ color: "var(--cz-critical)" }}>
                  {f.rule} FIRED · {f.control_id} · {f.criticality} · irreversibility{" "}
                  {f.irreversibility} · status {f.status}
                </div>
                <b className="mt-1 block text-[13px]">{f.headline}</b>
                <div className="text-[12.5px] text-cz-ink-2">{f.detail}</div>
                <div className="mt-2.5">
                  <SourceBody title={`${f.control_id} · source evidence`} source={f.source} />
                </div>
              </div>
            ))}
            <ReportShell>
              <ReportH>How the number was produced</ReportH>
              <Row3
                a="Base score"
                b="100 × (1 − satisfied weight ÷ applicable weight)"
                c={open.score === null ? "NOT_YET_APPLICABLE" : String(open.base)}
              />
              <Row3
                a="Satisfied weight"
                b="Complete — Verified only"
                c={`${open.satisfiedWeight.toFixed(1)} of ${open.applicableWeight.toFixed(1)}`}
              />
              <Row3 a="Penalties" b="critical/irreversible, adverse, blocked > 30d" c={`+${open.penalty}`} />
              <Row3
                a="Confidence"
                b="evidence-not-located weight removed"
                c={`${open.confidence}% · ${open.band}`}
                highlight={open.band === "INSUFFICIENT"}
              />
              <Row3 a="Excluded as N/A" b="removed from numerator and denominator" c={String(open.notApplicable)} />

              <ReportH>Controls behind the score</ReportH>
              {contributing.length === 0 ? (
                <div className="text-cz-ink-2">No applicable control instances at this stage.</div>
              ) : (
                contributing.map((c) => (
                  <Row3
                    key={c.spec.control_id}
                    a={`${c.spec.control_id} — ${c.spec.title || c.spec.requirement}`}
                    b={`${c.spec.criticality} · weight ${weightOf(c.spec).toFixed(1)}`}
                    c={STATUS_LABEL[c.status]}
                    highlight={c.status !== "COMPLETE_VERIFIED" && c.spec.criticality === "CRITICAL"}
                  />
                ))
              )}
              <div className="mt-1 flex flex-wrap gap-2 font-cz-mono text-[10px]">
                {(["COMPLETE_VERIFIED", "COMPLETE_UNVERIFIED", "EVIDENCE_NOT_LOCATED", "NOT_STARTED"] as ControlStatus[]).map(
                  (st) => (
                    <span key={st} style={{ color: STATUS_COLOR[st] }}>
                      ● {STATUS_LABEL[st]}
                    </span>
                  ),
                )}
              </div>
            </ReportShell>
            <Gate>
              ⏸ <b>Verification rule:</b> work asserted complete but not independently verified earns
              no credit and is reported separately as asserted-but-unverified.
            </Gate>
            <div className="mt-3.5 flex justify-end gap-2">
              <CzButton onClick={() => setOpen(null)}>Close</CzButton>
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}
