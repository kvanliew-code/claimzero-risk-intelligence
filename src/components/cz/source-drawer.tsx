// The source drawer — the moment the demo is won or lost.
// Shows the document, the page, the operative sentence highlighted, the date
// it was adopted and its source class. Never a paraphrase.

import { CzButton, Modal } from "@/components/cz/primitives";
import type { SourceExcerpt } from "@/lib/claimzero/demo";

const CLASS_LABEL: Record<SourceExcerpt["sourceClass"], string> = {
  CONTEMPORANEOUS_PROJECT_RECORD: "CONTEMPORANEOUS_PROJECT_RECORD",
  CONTRACT_DOCUMENT: "CONTRACT_DOCUMENT",
  THIRD_PARTY_RECORD: "THIRD_PARTY_RECORD",
  DERIVED_ANALYSIS: "DERIVED_ANALYSIS",
};

export function SourceBody({
  title,
  source,
  onClose,
}: {
  title: string;
  source: SourceExcerpt;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="cz-eyebrow" style={{ color: "var(--cz-accent)" }}>
        —— Source evidence
      </div>
      <h2 className="mt-1 font-cz-sans text-[16px] font-bold">{title}</h2>

      <div className="mt-3 rounded-[10px] border border-cz-rule bg-cz-bg">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-cz-rule px-3.5 py-2.5">
          <b className="text-[13px]">{source.document}</b>
          <span className="font-cz-mono text-[10.5px] text-cz-ink-3">{source.page}</span>
          <span className="ml-auto font-cz-mono text-[10.5px] text-cz-ink-3">{source.adopted}</span>
        </div>
        <div className="px-4 py-3.5 font-cz-mono text-[12px] leading-[1.75] text-cz-ink-2">
          {source.lines.map((l, i) => (
            <p
              key={i}
              className="mb-2.5"
              style={
                l.highlight
                  ? {
                      background: "color-mix(in srgb, var(--cz-accent-solid) 18%, transparent)",
                      borderLeft: "3px solid var(--cz-accent-solid)",
                      padding: "8px 10px",
                      color: "var(--cz-ink-1)",
                    }
                  : undefined
              }
            >
              {l.text}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <span
          className="rounded-full px-2.5 py-[3px] font-cz-mono text-[10px] tracking-[0.06em]"
          style={{
            border: "1px solid var(--cz-rule)",
            color: "var(--cz-accent)",
          }}
        >
          SOURCE CLASS · {CLASS_LABEL[source.sourceClass]}
        </span>
        <span
          className="rounded-full px-2.5 py-[3px] font-cz-mono text-[10px] tracking-[0.06em]"
          style={{
            border: "1px solid var(--cz-rule)",
            color:
              source.confidence === "FULL"
                ? "var(--cz-good)"
                : source.confidence === "LIMITED"
                  ? "var(--cz-warn)"
                  : "var(--cz-critical)",
          }}
        >
          CONFIDENCE · {source.confidence}
        </span>
        <span className="font-cz-mono text-[10.5px] text-cz-ink-3">
          synthetic demonstration record
        </span>
        {onClose ? (
          <CzButton className="ml-auto" onClick={onClose}>
            Close
          </CzButton>
        ) : null}
      </div>
    </>
  );
}

export function SourceDrawer({
  open,
  onClose,
  title,
  source,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  source: SourceExcerpt;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <SourceBody title={title} source={source} onClose={onClose} />
    </Modal>
  );
}
