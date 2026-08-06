import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { CzButton, Gate, ReportH, ReportShell, StatusPill } from "@/components/cz/primitives";
import { ProjectHeaderStrip } from "./project.$id";
import { aspectsFor, statusOf } from "@/lib/claimzero/data";
import { registerFor } from "@/lib/claimzero/docs";

const api = getRouteApi("/_authenticated/project/$id");

export const Route = createFileRoute("/_authenticated/project/$id/reports")({
  component: ProjectReports,
});

function ProjectReports() {
  const { project: p } = api.useLoaderData();
  const reg = registerFor(p);
  const top = aspectsFor(p.id)
    .filter((a) => a.flag)
    .sort((x, y) => y.s - x.s)
    .slice(0, 10);

  return (
    <>
      <ProjectHeaderStrip />
      <div className="px-5 pt-3.5 pb-10">
        <div className="mb-2 flex flex-wrap items-baseline gap-2.5">
          <h2 className="font-cz-sans text-[16px] font-bold">Project Reports</h2>
          <span className="text-[12px] text-cz-ink-3">
            issued only after the reviewer approval gate
          </span>
          <div className="ml-auto flex gap-2">
            <Link to="/reports">
              <CzButton>Portfolio generators →</CzButton>
            </Link>
            <CzButton primary onClick={() => window.print()}>
              ⎙ Print
            </CzButton>
          </div>
        </div>

        <ReportShell>
          <ReportH>Weekly Top 10 — {p.name}</ReportH>
          {top.map((a, i) => (
            <div
              key={a.n}
              className="flex items-baseline justify-between border-b border-cz-grid py-1.5 text-[12.5px]"
            >
              <span>
                <b className="font-cz-mono text-cz-ink-3">{i + 1}.</b>{" "}
                {a.flag?.txt.replace(/<\/?b>/g, "")}
                <span className="ml-2 font-cz-mono text-[10.5px] text-cz-ink-3">{a.seat}</span>
              </span>
              <span className="ml-2.5 flex-none">
                <StatusPill status={statusOf(a.s)} />
              </span>
            </div>
          ))}
          <ReportH>Information completeness</ReportH>
          <div className="text-[12.5px] text-cz-ink-2">
            {reg.completeness}% of required-for-stage inputs on file ({reg.receivedCount} of{" "}
            {reg.requiredCount}). Risk index confidence: <b>{reg.confidence}</b>.
          </div>
        </ReportShell>

        <Gate>
          ⏸ <b>Reviewer approval gate:</b> nothing on this page is delivered to the client until a
          reviewer approves it and every citation is verified against its source record.
        </Gate>
      </div>
    </>
  );
}
