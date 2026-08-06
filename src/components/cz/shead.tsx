import type { ReactNode } from "react";

export function SHead({ title, note }: { title: string; note: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2.5 px-5 pt-3.5">
      <h2 className="cz-eyebrow text-[12px] tracking-[0.18em]" style={{ color: "var(--cz-accent)" }}>
        —— {title}
      </h2>
      <span className="font-cz-serif text-[12px] text-cz-ink-3 italic">{note}</span>
    </div>
  );
}
