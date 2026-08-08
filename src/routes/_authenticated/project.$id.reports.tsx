import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { CzButton, Gate, ReportH, ReportShell, StatusPill } from "@/components/cz/primitives";
import { ProjectHeaderStrip } from "./project.$id";
import { statusOf } from "@/lib/claimzero/data";
import { useProjectScoring } from "@/lib/claimzero/useProjectScoring";
import { stageName } from "@/lib/claimzero/stages";

const api = getRouteApi("/_authenticated/project/$id");

export const Route = createFileRoute("/_authenticated/project/$id/reports")({
  component: ProjectReports,
});

/**
 * Defect D-18, fixed 8 Aug 2026.
 *
 * This page used to read `aspectsFor(project.id)` from `./data` — twelve hardcoded
 * aspects carrying invented dollar values AND invented source citations
 * ("Loan Admin Statement, Jul 2026 · Draw #22"), with a seeded LCG jitter applied
 * per project id. It rendered them under a heading that says the content is issued
 * only after a reviewer approval gate.
 *
 * A fabricated *citation* is worse than a fabricated number: a made-up document
 * reference is what destroys a methodology permanently. This page now reads the
 * real thirty-aspect scores from the database through `useProjectScoring`, which
 * already implements NOT_YET_APPLICABLE correctly (`score === null` when no
 * applicable control exists at the stage — absence is not zero).
 *
 * When nothing is loaded the page says so. It does not invent a Top Ten.
 */
function ProjectReports() {
  const { project: p } = api.useLoaderData();
  const { loading, error, scores, composite, stageNumber } = useProjectScoring(p);

  // Rank only aspects that are actually live at this stage. `score === null` is
  // NOT_YET_APPLICABLE and must never be treated as zero, and never as green.
  const ranked = scores
    .filter((s) => s.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const top = ranked.slice(0, 10);
  const notYetApplicable = scores.filter((s) => s.score === null).length;
  const held = Math.max(0, ranked.length - top.length);

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
          <ReportH>
            Weekly Top {top.length || 10} — {p.name}
          </ReportH>

          {loading && (
            <div className="py-2 text-[12.5px] text-cz-ink-3">Scoring the control register…</div>
          )}

          {error && (
            <div className="py-2 text-[12.5px] text-cz-critical">
              The register could not be scored: {error}. No ranking is shown, because a partial
              ranking would read as a complete one.
            </div>
          )}

          {!loading && !error && top.length === 0 && (
            <div className="py-2 text-[12.5px] text-cz-ink-2">
              <b>No supportable findings at Stage {stageNumber} — {stageName(stageNumber)}.</b>{" "}
              {scores.length === 0
                ? "No control register is loaded for this project, so there is nothing to assess. This is not a clean bill of health — it is an absence of evidence."
                : `All ${notYetApplicable} aspects read NOT_YET_APPLICABLE at this stage: no applicable control exists yet. Absence is not zero.`}
            </div>
          )}

          {!loading &&
            !error &&
            top.map((a, i) => (
              <div
                key={a.aspect_id}
                className="flex items-baseline justify-between border-b border-cz-grid py-1.5 text-[12.5px]"
              >
                <span>
                  <b className="font-cz-mono text-cz-ink-3">{i + 1}.</b> {a.aspect_name}
                  <span className="ml-2 text-cz-ink-2">{a.owner_question}</span>
                  <span className="ml-2 font-cz-mono text-[10.5px] text-cz-ink-3">
                    {a.verified}/{a.controls} verified
                    {a.adverse > 0 ? ` · ${a.adverse} adverse` : ""}
                  </span>
                </span>
                <span className="ml-2.5 flex-none">
                  <StatusPill status={statusOf(a.score ?? 0)} />
                </span>
              </div>
            ))}

          {/* No silent caps. If the engine bounded the list, the UI says what was held. */}
          {held > 0 && (
            <div className="pt-1.5 text-[11.5px] text-cz-ink-3">
              {held} further scored {held === 1 ? "aspect is" : "aspects are"} not shown — this view
              is capped at ten.
            </div>
          )}

          <ReportH>Information completeness</ReportH>
          <div className="text-[12.5px] text-cz-ink-2">
            {composite ? (
              <>
                Composite confidence <b>{composite.confidence}%</b> ({composite.band}).{" "}
                {composite.index === null ? (
                  <b>
                    Index withheld — confidence is below 60, so no number may be published for this
                    project.
                  </b>
                ) : (
                  <>
                    Published index <b>{composite.index}</b>.
                  </>
                )}{" "}
                {composite.outstanding} of {composite.requiredInputs} required inputs are
                outstanding.
                {composite.dataQualityFlag && (
                  <>
                    {" "}
                    <b className="text-cz-critical">
                      Data-quality flag: too little of the register is evidenced to characterise
                      this project.
                    </b>
                  </>
                )}
                {notYetApplicable > 0 && (
                  <> {notYetApplicable} aspects are NOT_YET_APPLICABLE at this stage.</>
                )}
              </>
            ) : (
              <b>No composite index — the register has not been scored for this project.</b>
            )}
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
