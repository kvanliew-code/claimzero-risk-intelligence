import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CzButton,
  Gate,
  Modal,
  ReportH,
  ReportShell,
  Row3,
  StatusPill,
  scoreColor,
} from "@/components/cz/primitives";
import { ProjectHeaderStrip } from "./project.$id";
import { COCKPITS, STATUS, aspectsFor, statusOf, type Aspect } from "@/lib/claimzero/data";

const api = getRouteApi("/_authenticated/project/$id");

export const Route = createFileRoute("/_authenticated/project/$id/aspects")({
  component: Aspects,
});

type ModalState =
  | { kind: "none" }
  | { kind: "report"; aspect: Aspect }
  | { kind: "cockpit"; aspect: Aspect };

function Aspects() {
  const { project: p } = api.useLoaderData();
  const aspects = useMemo(() => aspectsFor(p.id), [p.id]);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const close = () => setModal({ kind: "none" });

  return (
    <>
      <ProjectHeaderStrip />
      <div className="px-5 pt-3.5 pb-10">
        <div className="mb-2 flex flex-wrap items-baseline gap-2.5">
          <h2 className="font-cz-sans text-[16px] font-bold">The Twelve Aspects</h2>
          <span className="text-[12px] text-cz-ink-3">
            every panel scores 0–100 · trend-weighted · flags cite source records ·{" "}
            <b>click a panel to open its cockpit</b>
          </span>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-2.5">
          {aspects.map((a) => {
            const c = STATUS[statusOf(a.s)].varName;
            return (
              <div
                key={a.n}
                role="button"
                tabIndex={0}
                title="Open cockpit"
                onClick={() => setModal({ kind: "cockpit", aspect: a })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setModal({ kind: "cockpit", aspect: a });
                }}
                className="cursor-pointer rounded-[10px] border border-cz-rule bg-cz-surface px-3.5 py-3 transition-colors hover:border-cz-accent"
              >
                <h3 className="flex items-center gap-2 font-cz-sans text-[13px] font-bold">
                  <span className="font-cz-mono text-[11px] text-cz-ink-3">
                    {String(a.n).padStart(2, "0")}
                  </span>
                  {a.t}
                  <span
                    className="cz-figure ml-auto text-[16px] font-bold"
                    style={{ color: scoreColor(a.s) }}
                  >
                    {a.s}
                  </span>
                  <span className="text-[12px] text-cz-ink-3">⤢</span>
                </h3>
                <div className="mt-0.5 mb-2 font-cz-mono text-[10.5px] text-cz-ink-3">
                  Seat: {a.seat}
                </div>
                <div className="my-2 h-1.5 overflow-hidden rounded bg-cz-grid">
                  <i className="block h-full rounded" style={{ width: `${a.s}%`, background: c }} />
                </div>
                {a.metrics.map((m) => (
                  <div key={m[0]} className="flex justify-between py-0.5 text-[12px] text-cz-ink-2">
                    <span>{m[0]}</span>
                    <b className="cz-figure text-cz-ink-1">{m[1]}</b>
                  </div>
                ))}
                {a.flag ? (
                  <div className="mt-2 flex items-start gap-2 border-t border-dashed border-cz-grid pt-2 text-[12px] text-cz-ink-2">
                    <span style={{ color: c, fontSize: 14 }}>⚑</span>
                    <div>
                      <span dangerouslySetInnerHTML={{ __html: a.flag.txt }} />
                      <div className="mt-0.5 font-cz-mono text-[10px] text-cz-ink-3">
                        Source: {a.flag.cite}
                      </div>
                      <CzButton
                        className="mt-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModal({ kind: "report", aspect: a });
                        }}
                      >
                        Generate client report →
                      </CzButton>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={modal.kind === "report"} onClose={close}>
        {modal.kind === "report" && modal.aspect.flag ? (
          <>
            <h2 className="font-cz-sans text-[16px] font-bold">
              Flash Risk Report — {modal.aspect.t}
            </h2>
            <div className="mt-0.5 mb-3.5 font-cz-mono text-[11px] text-cz-ink-3">
              {p.name} · {p.city} · generated on demand from the live record
            </div>
            <ReportShell>
              <ReportH>Risk</ReportH>
              <div>{modal.aspect.flag.txt.replace(/<\/?b>/g, "")}</div>
              <ReportH>Status &amp; trend</ReportH>
              <div className="flex items-center gap-2">
                <StatusPill status={statusOf(modal.aspect.s)} />
                <span className="cz-figure">score {modal.aspect.s}/100</span>
              </div>
              <ReportH>Cited evidence (verbatim, verified)</ReportH>
              <div
                className="my-1.5 px-2.5 py-1 text-cz-ink-2 italic"
                style={{
                  borderLeft: "3px solid var(--cz-accent)",
                  background: "color-mix(in srgb, var(--cz-accent) 8%, transparent)",
                }}
              >
                &ldquo;…we are reserving all rights with respect to delays arising from the
                enclosure sequence…&rdquo;
                <span className="mt-0.5 block font-cz-mono text-[10.5px] text-cz-ink-3 not-italic">
                  {modal.aspect.flag.cite}
                </span>
              </div>
              <ReportH>Accountable seat</ReportH>
              <div>{modal.aspect.seat}</div>
              <ReportH>Recommended action</ReportH>
              <div>
                Owner directive within 5 business days; escalate at the weekly OAC with the cited
                record attached.
              </div>
            </ReportShell>
            <Gate>
              ⏸ <b>Reviewer approval gate:</b> this report is queued for human review. Nothing is
              delivered to the client unreviewed.
            </Gate>
            <div className="mt-3.5 flex justify-end gap-2">
              <CzButton onClick={close}>Close</CzButton>
              <CzButton primary onClick={close}>
                Approve &amp; send to client ✓
              </CzButton>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal open={modal.kind === "cockpit"} onClose={close}>
        {modal.kind === "cockpit"
          ? (() => {
              const a = modal.aspect;
              const ck = COCKPITS[a.n];
              return (
                <>
                  <h2 className="font-cz-sans text-[16px] font-bold">
                    {ck ? ck.title : `${a.t} — Cockpit`}
                  </h2>
                  <div className="mt-0.5 mb-3.5 text-[12px] text-cz-ink-3">
                    {p.name} ·{" "}
                    {ck
                      ? ck.sub
                      : "Daily-watched signals for this aspect. Every participant is scored, not asked."}
                  </div>
                  <ReportShell>
                    {ck ? (
                      ck.sections.map((sec) => (
                        <div key={sec.h}>
                          <ReportH>{sec.h}</ReportH>
                          {sec.note ? <div className="text-cz-ink-2">{sec.note}</div> : null}
                          {sec.rows?.map((r) => (
                            <Row3 key={r[0]} a={r[0]} b={r[1]} c={r[2]} highlight={r[3]} />
                          ))}
                        </div>
                      ))
                    ) : (
                      <>
                        <ReportH>On daily watch in this aspect</ReportH>
                        {a.metrics.map((m) => (
                          <Row3 key={m[0]} a={m[0]} b="auto-pulled" c={m[1]} />
                        ))}
                        <ReportH>Passive seat scorecard</ReportH>
                        <Row3 a={a.seat} b="scored from the record" c="no forms, no disruption" />
                      </>
                    )}
                  </ReportShell>
                  <Gate>
                    ◉ <b>Zero-disruption rule:</b> everything above is read from systems the project
                    already runs. No one on site fills out anything.
                  </Gate>
                  <div className="mt-3.5 flex justify-end gap-2">
                    <CzButton onClick={close}>Close</CzButton>
                    {a.flag ? (
                      <CzButton primary onClick={() => setModal({ kind: "report", aspect: a })}>
                        Generate client report →
                      </CzButton>
                    ) : null}
                  </div>
                </>
              );
            })()
          : null}
      </Modal>
    </>
  );
}
