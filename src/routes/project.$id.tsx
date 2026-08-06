import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CzHeader } from "@/components/cz/header";
import {
  CzButton,
  Dial,
  Gate,
  Modal,
  ReportH,
  ReportShell,
  Row3,
  Sparkline,
  StatusPill,
  TrendTag,
  scoreColor,
} from "@/components/cz/primitives";
import {
  ASPECTS,
  COCKPITS,
  DAILY30,
  STATUS,
  aspectsFor,
  projects,
  statusOf,
  type Aspect,
} from "@/lib/claimzero/data";

export const Route = createFileRoute("/project/$id")({
  loader: ({ params }) => {
    const project = projects[Number(params.id)];
    if (!project) throw notFound();
    return { project };
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [{ title: "Project unavailable — ClaimZero" }, { name: "robots", content: "noindex" }],
      };
    const p = loaderData.project;
    const title = `${p.name} — ClaimZero Project Risk`;
    const description = `${p.city} · $${p.sizeM}M ${p.type}. Twelve aspect panels, daily-watched signals, and cited risk flags for ${p.name}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ProjectView,
});

type ModalState =
  | { kind: "none" }
  | { kind: "report"; aspect: Aspect }
  | { kind: "cockpit"; aspect: Aspect }
  | { kind: "daily" }
  | { kind: "weekly" };

function Manifest({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="my-3 flex flex-wrap items-center gap-2">
      <b className="cz-eyebrow">{label}</b>
      {children}
    </div>
  );
}

function Chip({ color, children }: { color?: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-cz-grid bg-cz-surface px-2.5 py-[3px] font-cz-mono text-[10.5px] tracking-[0.03em] text-cz-ink-2">
      {color ? (
        <span className="h-2 w-2 flex-none rounded-full" style={{ background: color }} />
      ) : null}
      {children}
    </span>
  );
}

function ProjectView() {
  const { project: p } = Route.useLoaderData();
  const aspects = useMemo(() => aspectsFor(p.id), [p.id]);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const close = () => setModal({ kind: "none" });
  const isFlagship = p.id === 0;

  return (
    <div className="min-h-screen">
      <CzHeader
        crumb={
          <>
            Portfolio › <b className="text-cz-ink-1">{p.name}</b> · {p.city} · ${p.sizeM}M {p.type}
          </>
        }
        actions={
          <>
            <Link to="/">
              <CzButton>← Portfolio</CzButton>
            </Link>
            <CzButton primary onClick={() => setModal({ kind: "weekly" })}>
              Generate Weekly Top 10
            </CzButton>
          </>
        }
      />

      <div className="px-5 pt-3.5 pb-10">
        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-cz-rule bg-cz-surface p-4">
          <Dial value={p.idx} />
          <div className="grid min-w-[300px] flex-1 grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3.5">
            <div>
              <div className="cz-eyebrow">Status</div>
              <div className="my-1">
                <StatusPill status={statusOf(p.idx)} />
              </div>
              <div className="text-[11.5px] text-cz-ink-2">
                <TrendTag d={p.delta} /> vs last week — trajectory-weighted
              </div>
            </div>
            <div>
              <div className="cz-eyebrow">Daily interest carry</div>
              <div className="cz-figure text-[17px] font-bold">
                ${(p.sizeM * 160).toLocaleString()}
              </div>
              <div className="text-[11.5px] text-cz-ink-2">65% LTC @ 9%, drawn</div>
            </div>
            <div>
              <div className="cz-eyebrow">Priced exposure (open)</div>
              <div className="cz-figure text-[17px] font-bold">${p.exposure.toFixed(1)}M</div>
              <div className="text-[11.5px] text-cz-ink-2">reviewer-approved ranges</div>
            </div>
            <div>
              <div className="cz-eyebrow">Stage</div>
              <div className="font-cz-sans text-[15px] font-bold">{p.stage}</div>
              <div className="text-[11.5px] text-cz-ink-2">stage-gated rubric active</div>
            </div>
            <div>
              <div className="cz-eyebrow">12-week index</div>
              <Sparkline data={p.trend} w={120} h={30} />
              <div className="text-[11.5px] text-cz-ink-2">exposure × trajectory</div>
            </div>
          </div>
        </div>

        <Manifest label="Data manifest">
          <Chip color="var(--cz-good)">Procore feed — live</Chip>
          <Chip color="var(--cz-good)">Pro forma baseline — v3</Chip>
          <Chip color="var(--cz-good)">Bank requisition — Jul rec&apos;d</Chip>
          <Chip color={isFlagship ? "var(--cz-warn)" : "var(--cz-good)"}>
            Anticipated cost report — {isFlagship ? "8 days stale" : "current"}
          </Chip>
          <Chip color="var(--cz-good)">Sales / absorption — Jul rec&apos;d</Chip>
          <span className="font-cz-mono text-[10.5px] text-cz-ink-3">
            missing input → domain reads &ldquo;insufficient data&rdquo;, never estimated
          </span>
        </Manifest>

        <Manifest label="Integrations">
          <Chip color="var(--cz-good)">Procore API — pulled 2h ago</Chip>
          <Chip color="var(--cz-good)">Site video (OpenSpace) — walk 6h ago, L63</Chip>
          <Chip color="var(--cz-warn)">
            Site access / turnstiles — 212 on site vs 226 on daily report
          </Chip>
          <Chip color="var(--cz-good)">DOB NOW poll — 2h ago</Chip>
          <Chip color="var(--cz-good)">DOT / MTA permits — daily</Chip>
          <Chip color="var(--cz-good)">Lien &amp; docket poll — daily</Chip>
          <CzButton className="rounded-full" onClick={() => setModal({ kind: "daily" })}>
            ☰ Daily Watch — 30 items · 4 alerting
          </CzButton>
        </Manifest>

        <div className="mt-5 mb-2 flex flex-wrap items-baseline gap-2.5">
          <h2 className="font-cz-sans text-[16px] font-bold">The Twelve Aspects</h2>
          <span className="text-[12px] text-cz-ink-3">
            every panel scores 0–100 · trend-weighted · flags cite source records ·{" "}
            <b>click a panel to open its cockpit</b>
          </span>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-2.5">
          {aspects.map((a) => {
            const st = statusOf(a.s);
            const c = STATUS[st].varName;
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
                  Seat: {a.seat} · <TrendTag d={a.d} /> wk
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

      <p className="px-5 pb-8 text-center text-[11.5px] text-cz-ink-3">
        Concept mockup — all data synthetic. Every flagged risk cites a source record and passes the
        reviewer approval gate before any client delivery.
      </p>

      {/* ---- Flash risk report ---- */}
      <Modal open={modal.kind === "report"} onClose={close}>
        {modal.kind === "report" && modal.aspect.flag ? (
          <>
            <h2 className="font-cz-sans text-[16px] font-bold">
              Flash Risk Report — {modal.aspect.t}
            </h2>
            <div className="mt-0.5 mb-3.5 font-cz-mono text-[11px] text-cz-ink-3">
              {p.name} · {p.city} · generated on demand from the live record · Aug 6, 2026
            </div>
            <ReportShell>
              <ReportH>Risk</ReportH>
              <div>{modal.aspect.flag.txt.replace(/<\/?b>/g, "")}</div>
              <ReportH>Status &amp; trend</ReportH>
              <div className="flex items-center gap-2">
                <StatusPill status={statusOf(modal.aspect.s)} />
                <span className="cz-figure">
                  score {modal.aspect.s}/100,{" "}
                  {modal.aspect.d >= 0
                    ? `worsening +${modal.aspect.d}`
                    : `improving ${modal.aspect.d}`}{" "}
                  this week
                </span>
              </div>
              <ReportH>Cited evidence (verbatim, verified)</ReportH>
              <div
                className="my-1.5 px-2.5 py-1 italic text-cz-ink-2"
                style={{
                  borderLeft: "3px solid var(--cz-accent)",
                  background: "color-mix(in srgb, var(--cz-accent) 8%, transparent)",
                }}
              >
                &ldquo;…we are reserving all rights with respect to delays arising from the
                enclosure sequence…&rdquo;
                <span className="mt-0.5 block font-cz-mono text-[10.5px] not-italic text-cz-ink-3">
                  {modal.aspect.flag.cite}
                </span>
              </div>
              <ReportH>Financial exposure</ReportH>
              <div className="cz-figure">
                $0.9M – $1.9M{" "}
                <span className="text-cz-ink-3">
                  (reviewer-entered; basis: 14-day carry + extended GCs per loan terms)
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
              delivered to the client unreviewed — every quote verified against its source document.
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

      {/* ---- Aspect cockpit ---- */}
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
                      : "Daily-watched signals for this aspect. Every participant is scored, not asked — zero added work on site."}
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
                        <Row3
                          a="Signal deltas vs prior day"
                          b="6–24h pull cadence"
                          c="no manual entry — ever"
                        />
                        <ReportH>Passive seat scorecard</ReportH>
                        <Row3
                          a={a.seat}
                          b="scored from the record"
                          c="no forms, no disruption"
                        />
                      </>
                    )}
                  </ReportShell>
                  <Gate>
                    ◉ <b>Zero-disruption rule:</b> everything above is read from systems the project
                    already runs — Procore/ACC, site video, access control, agency portals. No one on
                    site fills out anything.
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

      {/* ---- Daily Watch ---- */}
      <Modal open={modal.kind === "daily"} onClose={close}>
        {modal.kind === "daily"
          ? (() => {
              let i = 0;
              return (
                <>
                  <h2 className="font-cz-sans text-[16px] font-bold">The Daily Watch — 30 items</h2>
                  <div className="mt-0.5 mb-3.5 text-[12px] text-cz-ink-3">
                    The daily telemetry layer under the Monday report, hung on the critical-path arc.
                    All auto-pulled; the weekly Top 10 is the reviewed summary of what this layer
                    catches. Combine or cut in Ken&apos;s ratification pass.
                  </div>
                  <ReportShell>
                    {DAILY30.map((gr) => (
                      <div key={gr.g}>
                        <ReportH>{gr.g}</ReportH>
                        {gr.items.map((d) => {
                          i++;
                          const num = String(i).padStart(2, "0");
                          return (
                            <Row3
                              key={d[0]}
                              a={
                                <>
                                  <b className="font-cz-mono text-cz-ink-3">{num}</b> {d[0]}
                                  {d[2] ? (
                                    <span style={{ color: "var(--cz-critical)" }}> ⚑</span>
                                  ) : null}
                                </>
                              }
                              b={d[1]}
                              c={d[2] ? "alerting" : "watching"}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </ReportShell>
                  <Gate>
                    ◉ <b>Zero-disruption rule:</b> all 30 are auto-pulled on a 6–24 hour cadence from
                    systems the project already runs. Nobody on site is asked for anything extra.
                  </Gate>
                  <div className="mt-3.5 flex justify-end gap-2">
                    <CzButton onClick={close}>Close</CzButton>
                  </div>
                </>
              );
            })()
          : null}
      </Modal>

      {/* ---- Weekly Top 10 ---- */}
      <Modal open={modal.kind === "weekly"} onClose={close}>
        <h2 className="font-cz-sans text-[16px] font-bold">Weekly Top 10 — Monday Issuance</h2>
        <div className="mt-0.5 mb-3.5 text-[12px] text-cz-ink-3">
          Auto-composed from the worst flags across the twelve aspects, ranked by exposure ×
          trajectory
        </div>
        <ReportShell>
          {ASPECTS.filter((a) => a.flag)
            .sort((x, y) => y.s - x.s)
            .slice(0, 10)
            .map((a, i) => (
              <div
                key={a.n}
                className="flex items-baseline justify-between border-b border-cz-grid py-1.5 text-[12.5px]"
              >
                <span>
                  <b className="font-cz-mono text-cz-ink-3">{i + 1}.</b>{" "}
                  {a.flag?.txt.replace(/<\/?b>/g, "")}
                </span>
                <span className="ml-2.5 flex-none">
                  <StatusPill status={statusOf(a.s)} />
                </span>
              </div>
            ))}
        </ReportShell>
        <Gate>
          ⏸ <b>Reviewer approval gate:</b> the Top 10 issues Monday morning only after human
          approval — one page, five-minute read, act the same day.
        </Gate>
        <div className="mt-3.5 flex justify-end gap-2">
          <CzButton onClick={close}>Close</CzButton>
          <CzButton primary onClick={close}>
            Send to reviewer queue →
          </CzButton>
        </div>
      </Modal>
    </div>
  );
}
