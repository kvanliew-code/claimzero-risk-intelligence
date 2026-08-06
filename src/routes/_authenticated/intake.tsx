import { createFileRoute } from "@tanstack/react-router";
import { CzHeader } from "@/components/cz/header";
import { SHead } from "@/components/cz/shead";

export const Route = createFileRoute("/_authenticated/intake")({
  head: () => ({
    meta: [
      { title: "New Project / Intake — ClaimZero" },
      {
        name: "description",
        content:
          "Project identity, owner-directed API connections, the one-time setup document checklist and the monthly recurring feed with a named accountable person per item.",
      },
      { property: "og:title", content: "New Project / Intake — ClaimZero" },
      {
        property: "og:description",
        content: "Every document shows its source: direct upload, connected folder, or API pull.",
      },
    ],
  }),
  component: Intake,
});

function Intake() {
  return (
    <div className="min-h-screen">
      <CzHeader
        crumb={
          <>
            <b className="text-cz-ink-1">New Project / Intake</b> · specified, not yet mocked
          </>
        }
      />
      <SHead
        title="New Project / Intake"
        note="specified in the Developer Brief — built in the platform, not this mockup"
      />
      <p className="max-w-[640px] px-5 py-3 font-cz-serif text-cz-ink-2">
        The intake wizard: project identity, API connections (Procore/ACC read-only,
        owner-directed), the one-time owner setup document checklist (pro forma, budgets, loan
        docs, offering plan, agreements, insurance, survey, NDA), and the monthly recurring feed
        with a named accountable person per item. Documents arrive by direct upload, connected
        Egnyte folder, or API pull — every document shows its source.
      </p>
    </div>
  );
}
