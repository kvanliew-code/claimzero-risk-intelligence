import { createFileRoute, Link, Outlet, notFound } from "@tanstack/react-router";
import { CzHeader } from "@/components/cz/header";
import { CzButton, Dial } from "@/components/cz/primitives";
import { projects } from "@/lib/claimzero/data";
import { CONFIDENCE_COLOR, registerFor } from "@/lib/claimzero/docs";

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
  return (
    <div className="px-5 pt-3.5">
      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-cz-rule bg-cz-surface p-4">
        <Dial value={p.idx} />
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
        <div
          className="min-w-[260px] flex-1 rounded-[8px] px-3 py-2.5"
          style={{
            borderLeft: `3px solid ${color}`,
            background: `color-mix(in srgb, ${color} 10%, transparent)`,
          }}
        >
          <div className="cz-eyebrow" style={{ color }}>
            Risk index confidence: {reg.confidence.toUpperCase()}
          </div>
          <div className="mt-1 text-[12.5px] text-cz-ink-2">
            {reg.outstanding.length === 0 ? (
              <>All required inputs for the {p.stage} stage are on file.</>
            ) : (
              <>
                <b className="text-cz-ink-1">
                  {reg.outstanding.length} of {reg.requiredCount} required inputs outstanding
                </b>{" "}
                — the index is computed on an incomplete record and is not full-confidence.{" "}
                <Link
                  to="/project/$id/documents"
                  params={{ id: String(p.id) }}
                  search={{ status: "outstanding" }}
                  className="underline"
                  style={{ color: "var(--cz-accent)" }}
                >
                  See the outstanding list →
                </Link>
              </>
            )}
          </div>
        </div>
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
