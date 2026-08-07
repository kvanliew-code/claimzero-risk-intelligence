import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  CzButton,
  Gate,
  Modal,
  ReportH,
  ReportShell,
  Row3,
  Sparkline,
  StatusPill,
  TrendTag,
} from "@/components/cz/primitives";
import { EXPOSURE } from "@/lib/claimzero/demo";
import {
  DivergencePanel,
  ExposurePanel,
  FindingsPanel,
} from "@/components/cz/demo-surfaces";
import { ProjectHeaderStrip } from "./project.$id";
import { DAILY30, statusOf } from "@/lib/claimzero/data";
import { useProjectScoring } from "@/lib/claimzero/useProjectScoring";
import { registerFor } from "@/lib/claimzero/docs";

const api = getRouteApi("/_authenticated/project/$id");

export const Route = createFileRoute("/_authenticated/project/$id/")({
  component: Overview,
});

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

function Overview() {
  const { project: p } = api.useLoaderData();
  const reg = registerFor(p);
  const scoring = useProjectScoring(p);
  const published = scoring.composite?.index ?? null;
  const displayIdx = scoring.composite ? scoring.composite.raw : p.idx;
  const aspects = scoring.scores
    .filter((a) => a.score !== null)
    .map((a) => ({ n: a.aspect_id, t: a.aspect_name, s: a.score as number }));
  const [daily, setDaily] = useState(false);
  const isFlagship = p.id === 0;

  return (
    <>
      <ProjectHeaderStrip />

      <div className="px-5 pt-3.5 pb-10">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5 rounded-xl border border-cz-rule bg-cz-surface p-4">
          <div>
            <div className="cz-eyebrow">Status</div>
            <div className="my-1">
              <StatusPill status={statusOf(displayIdx)} />
            </div>
            <div className="text-[11.5px] text-cz-ink-2">
              {scoring.loading
                ? "Scoring against the control register…"
                : published === null
                  ? `Index withheld — confidence ${scoring.composite?.confidence ?? 0}%`
                  : `Index ${published} · confidence ${scoring.composite?.confidence ?? 0}%`}
            </div>
            <div className="text-[11.5px] text-cz-ink-2">
              <TrendTag d={p.delta} /> vs last week — trajectory-weighted
            </div>
          </div>
          <div>
            <div className="cz-eyebrow">Daily interest carry</div>
            <div className="cz-figure text-[17px] font-bold">
              ${(isFlagship ? EXPOSURE.carryPerDay : p.sizeM * 160).toLocaleString()}
            </div>
            <div className="text-[11.5px] text-cz-ink-2">65% LTC @ 9%, drawn</div>
          </div>
          <div>
            <div className="cz-eyebrow">Priced exposure (open)</div>
            <div className="cz-figure text-[17px] font-bold">
              {isFlagship ? `$${EXPOSURE.total.toLocaleString()}` : `$${p.exposure.toFixed(1)}M`}
            </div>
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
          <Chip color="var(--cz-good)">Site video (OpenSpace) — walk 6h ago</Chip>
          <Chip color="var(--cz-warn)">Site access / turnstiles — 212 on site vs 226 reported</Chip>
          <Chip color="var(--cz-good)">DOB NOW poll — 2h ago</Chip>
          <Chip color="var(--cz-good)">Lien &amp; docket poll — daily</Chip>
          <CzButton className="rounded-full" onClick={() => setDaily(true)}>
            ☰ Daily Watch — 30 items · 4 alerting
          </CzButton>
        </Manifest>

        {isFlagship ? (
          <div className="mb-2.5 grid grid-cols-1 gap-2.5">
            <FindingsPanel />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-2.5">
              <DivergencePanel />
              <ExposurePanel />
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-2.5">
          <div className="rounded-[10px] border border-cz-rule bg-cz-surface px-3.5 py-3">
            <div className="cz-eyebrow" style={{ color: "var(--cz-accent)" }}>
              —— Worst-standing aspects
            </div>
            {aspects
              .slice()
              .sort((a, b) => b.s - a.s)
              .slice(0, 5)
              .map((a) => (
                <Link
                  key={a.n}
                  to="/project/$id/aspects"
                  params={{ id: String(p.id) }}
                  className="flex items-baseline justify-between border-b border-cz-grid py-1.5 text-[12.5px] hover:text-cz-ink-1"
                >
                  <span>{a.t}</span>
                  <span className="ml-2.5 flex-none">
                    <StatusPill status={statusOf(a.s)} />
                  </span>
                </Link>
              ))}
            <Link
              to="/project/$id/aspects"
              params={{ id: String(p.id) }}
              className="mt-2 inline-block font-cz-mono text-[10.5px] uppercase"
              style={{ color: "var(--cz-accent)" }}
            >
              Open the thirty aspects →
            </Link>
          </div>

          <div className="rounded-[10px] border border-cz-rule bg-cz-surface px-3.5 py-3">
            <div className="cz-eyebrow" style={{ color: "var(--cz-accent)" }}>
              —— Outstanding required inputs
            </div>
            {reg.outstanding.slice(0, 5).map((d) => (
              <div
                key={d.key}
                className="flex items-baseline justify-between border-b border-cz-grid py-1.5 text-[12.5px]"
              >
                <span>{d.name}</span>
                <span className="ml-2.5 flex-none font-cz-mono text-[10.5px] text-cz-ink-3">
                  {d.owedBy} · {d.daysOutstanding}d
                </span>
              </div>
            ))}
            {reg.outstanding.length === 0 ? (
              <div className="py-2 text-[12.5px] text-cz-ink-2">Nothing outstanding.</div>
            ) : null}
            <Link
              to="/project/$id/documents"
              params={{ id: String(p.id) }}
              search={{ status: "outstanding" }}
              className="mt-2 inline-block font-cz-mono text-[10.5px] uppercase"
              style={{ color: "var(--cz-accent)" }}
            >
              Open the document register →
            </Link>
          </div>
        </div>
      </div>

      <Modal open={daily} onClose={() => setDaily(false)}>
        {(() => {
          let i = 0;
          return (
            <>
              <h2 className="font-cz-sans text-[16px] font-bold">The Daily Watch — 30 items</h2>
              <div className="mt-0.5 mb-3.5 text-[12px] text-cz-ink-3">
                The daily telemetry layer under the Monday report, hung on the critical-path arc.
              </div>
              <ReportShell>
                {DAILY30.map((gr) => (
                  <div key={gr.g}>
                    <ReportH>{gr.g}</ReportH>
                    {gr.items.map((d) => {
                      i++;
                      return (
                        <Row3
                          key={d[0]}
                          a={
                            <>
                              <b className="font-cz-mono text-cz-ink-3">
                                {String(i).padStart(2, "0")}
                              </b>{" "}
                              {d[0]}
                              {d[2] ? <span style={{ color: "var(--cz-critical)" }}> ⚑</span> : null}
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
                systems the project already runs.
              </Gate>
              <div className="mt-3.5 flex justify-end gap-2">
                <CzButton onClick={() => setDaily(false)}>Close</CzButton>
              </div>
            </>
          );
        })()}
      </Modal>
    </>
  );
}
