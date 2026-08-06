import { createFileRoute } from "@tanstack/react-router";
import { CzHeader } from "@/components/cz/header";
import { SHead } from "@/components/cz/shead";

export const Route = createFileRoute("/queue")({
  head: () => ({
    meta: [
      { title: "Reviewer Queue — ClaimZero" },
      {
        name: "description",
        content:
          "Every surfaced risk and every exposure value waits here for human approval before it reaches a client.",
      },
      { property: "og:title", content: "Reviewer Queue — ClaimZero" },
      {
        property: "og:description",
        content: "Nothing reaches a client unreviewed — the queue is the product's warranty.",
      },
    ],
  }),
  component: Queue,
});

function Queue() {
  return (
    <div className="min-h-screen">
      <CzHeader
        crumb={
          <>
            <b className="text-cz-ink-1">Reviewer Queue</b> · specified, not yet mocked
          </>
        }
      />
      <SHead
        title="Reviewer Queue"
        note="specified in the Developer Brief — built in the platform, not this mockup"
      />
      <p className="max-w-[640px] px-5 py-3 font-cz-serif text-cz-ink-2">
        Every surfaced risk and every exposure value waits here for human approval. Nothing reaches
        a client unreviewed — the queue is the product's warranty.
      </p>
    </div>
  );
}
