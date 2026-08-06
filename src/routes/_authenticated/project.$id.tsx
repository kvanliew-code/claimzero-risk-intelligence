import { createFileRoute, Link, Outlet, notFound } from "@tanstack/react-router";
import { CzHeader } from "@/components/cz/header";
import { CzButton, Dial } from "@/components/cz/primitives";
import { projects } from "@/lib/claimzero/data";
import {
  DEMO_CONFIDENCE,
  DEMO_INPUTS_OUTSTANDING,
  DEMO_INPUTS_TOTAL,
  isDemoProject,
} from "@/lib/claimzero/demo";
import { CONFIDENCE_COLOR, registerFor } from "@/lib/claimzero/docs";
import { BAND_COLOR, bandOf, scoreColorFor } from "@/lib/claimzero/scoring";
import { useProjectScoring } from "@/lib/claimzero/useProjectScoring";


export const Route = createFileRoute("/_authenticated/project/$id")({
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
    const description = `${p.city} · $${p.sizeM}M ${p.type}. Twelve aspect panels, the stage-aware document register and cited risk flags for ${p.name}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ProjectLayout,
});

export function ProjectHeaderStrip() {
  const { project: p } = Route.useLoaderData();
  const reg = registerFor(p);
  const color = CONFIDENCE_COLOR[reg.confidence];
  const scoring = useProjectScoring(p);
  const comp = scoring.composite;
  const demo = isDemoProject(p.id);
  const demoBand = bandOf(DEMO_CONFIDENCE);
  return (
    <div className="px-5 pt-3.5">
      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-cz-rule bg-cz-surface p-4">
        {comp && comp.index !== null ? (
          <Dial value={comp.index} />
        ) : (
          <div className="flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full border border-dashed border-cz-grid text-center">
            <span className="font-cz-mono text-[10px] text-cz-ink-3">INDEX</span>
            <span className="font-cz-mono text-[10px]" style={{ color: "var(--cz-critical)" }}>
              WITHHELD
            </span>
          </div>
        )}
        <div>
          <div className="cz-eyebrow">Composite risk index</div>
          <div
            className="cz-figure text-[26px] font-bold"
            style={{ color: scoreColorFor(comp?.index ?? null) }}
          >
            {scoring.loading ? "…" : comp?.index !== null && comp ? comp.index : "—"}
          </div>
          <div className="text-[11.5px] text-cz-ink-2">
            {comp
              ? `weights derived from control mass at stage ${scoring.stageNumber}${comp.overridden ? " · admin override applied" : ""}`
              : "computed from verified control evidence"}
          </div>
          {comp?.dataQualityFlag && (
            <div className="mt-1 font-cz-mono text-[10px]" style={{ color: "var(--cz-warn)" }}>
              ⚑ Below 25 — treated as a data-quality signal, not an achievement.
            </div>
          )}
        </div>
        <div>
          <div className="cz-eyebrow">Information completeness</div>
          <div className="cz-figure text-[26px] font-bold" style={{ color }}>
            {reg.completeness}%
          </div>
          <div className="text-[11.5px] text-cz-ink-2">
            {reg.receivedCount} of {reg.requiredCount} required-for-stage items received
          </div>
          <div className="mt-1.5 h-1.5 w-[180px] overflow-hidden rounded bg-cz-grid">
            <i
              className="block h-full rounded"
              style={{ width: `${reg.completeness}%`, background: color }}
            />
          </div>
        </div>

        {demo ? (
          <div
            className="min-w-[260px] flex-1 rounded-[8px] px-3 py-2.5"
            style={{
              borderLeft: `3px solid ${BAND_COLOR[demoBand]}`,
              background: `color-mix(in srgb, ${BAND_COLOR[demoBand]} 10%, transparent)`,
            }}
          >
            <div className="cz-eyebrow" style={{ color: BAND_COLOR[demoBand] }}>
              Risk index confidence: {demoBand} · {DEMO_CONFIDENCE}%
            </div>
            <div className="mt-1 text-[12.5px] text-cz-ink-2">
              <b className="text-cz-ink-1">
                {DEMO_INPUTS_OUTSTANDING} of {DEMO_INPUTS_TOTAL} required inputs outstanding
              </b>{" "}
              — the index is published with what is known and the gap is stated. Where evidence is
              not located we say so; we never estimate it.{" "}
              <Link
                to="/project/$id/documents"
                params={{ id: String(p.id) }}
                search={{ status: "outstanding" }}
                className="underline"
                style={{ color: "var(--cz-accent)" }}
              >
                See the outstanding list →
              </Link>
            </div>
          </div>
        ) : (
          <div
            className="min-w-[260px] flex-1 rounded-[8px] px-3 py-2.5"
            style={{
              borderLeft: `3px solid ${comp ? BAND_COLOR[comp.band] : color}`,
              background: `color-mix(in srgb, ${comp ? BAND_COLOR[comp.band] : color} 10%, transparent)`,
            }}
          >
            <div className="cz-eyebrow" style={{ color: comp ? BAND_COLOR[comp.band] : color }}>
              Risk index confidence:{" "}
              {comp ? `${comp.band} · ${comp.confidence}%` : reg.confidence.toUpperCase()}
            </div>
            <div className="mt-1 text-[12.5px] text-cz-ink-2">
              {comp && comp.index === null ? (
                <>
                  <b className="text-cz-ink-1">
                    {comp.outstanding} of {comp.requiredInputs} required inputs outstanding
                  </b>{" "}
                  — no Composite Project Risk Index is published on an incomplete record.{" "}
                </>
              ) : reg.outstanding.length === 0 ? (
                <>All required inputs for the {p.stage} stage are on file.</>
              ) : (
                <>
                  <b className="text-cz-ink-1">
                    {reg.outstanding.length} of {reg.requiredCount} required inputs outstanding
                  </b>{" "}
                  — the index is computed on an incomplete record and is not full-confidence.{" "}
                </>
              )}
              <Link
                to="/project/$id/documents"
                params={{ id: String(p.id) }}
                search={{ status: "outstanding" }}
                className="underline"
                style={{ color: "var(--cz-accent)" }}
              >
                See the outstanding list →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>

  );
}

function ProjectLayout() {
  const { project: p } = Route.useLoaderData();
  return (
    <div className="min-h-screen">
      <CzHeader
        crumb={
          <>
            Portfolio › <b className="text-cz-ink-1">{p.name}</b> · {p.city} · ${p.sizeM}M {p.type}
          </>
        }
        actions={
          <Link to="/portfolio">
            <CzButton>← Portfolio</CzButton>
          </Link>
        }
      />
      <Outlet />
    </div>
  );
}
