// Demo surfaces — the divergence split view, the exposure panel and the
// planted-findings list. Demo project only; synthetic composite data.

import { useState } from "react";
import { CzButton } from "@/components/cz/primitives";
import { SourceDrawer } from "@/components/cz/source-drawer";
import { DEMO_FINDINGS, DIVERGENCE, EXPOSURE, type DemoFinding } from "@/lib/claimzero/demo";

function Panel({
  eyebrow,
  children,
  accent,
}: {
  eyebrow: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      className="rounded-[10px] border border-cz-rule bg-cz-surface px-3.5 py-3"
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
    >
      <div className="cz-eyebrow" style={{ color: "var(--cz-accent)" }}>
        —— {eyebrow}
      </div>
      {children}
    </div>
  );
}

/** 1:40 — his schedule, your schedule, eleven weeks apart. */
export function DivergencePanel() {
  const max = Math.max(...DIVERGENCE.series.map((s) => s.cz)) || 1;
  return (
    <Panel eyebrow="Independent delay position" accent="var(--cz-critical)">
      <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <div className="rounded-[8px] border border-cz-grid px-3 py-2.5">
          <div className="font-cz-mono text-[10.5px] text-cz-ink-3">{DIVERGENCE.cmLabel}</div>
          <div className="cz-figure mt-1 text-[22px] font-bold">0 days</div>
          <div className="text-[12px] text-cz-ink-2">
            completion held at {DIVERGENCE.completion}; no time extension requested
          </div>
        </div>
        <div
          className="rounded-[8px] px-3 py-2.5"
          style={{
            border: "1px solid var(--cz-critical)",
            background: "color-mix(in srgb, var(--cz-critical) 10%, transparent)",
          }}
        >
          <div className="font-cz-mono text-[10.5px]" style={{ color: "var(--cz-critical)" }}>
            {DIVERGENCE.czLabel}
          </div>
          <div className="cz-figure mt-1 text-[22px] font-bold" style={{ color: "var(--cz-critical)" }}>
            24 days
          </div>
          <div className="text-[12px] text-cz-ink-2">
            derived from unanswered RFIs, submittals not returned and manpower under the curve
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-end gap-2">
          {DIVERGENCE.series.map((s) => (
            <div key={s.period} className="flex-1 text-center">
              <div className="relative mx-auto h-[64px] w-full">
                <div
                  className="absolute bottom-0 w-full rounded-t"
                  style={{
                    height: `${(s.cz / max) * 100}%`,
                    background: "color-mix(in srgb, var(--cz-critical) 70%, transparent)",
                  }}
                />
                <div
                  className="absolute bottom-0 w-full border-b-2"
                  style={{ borderColor: "var(--cz-ink-3)" }}
                />
              </div>
              <div className="mt-1 font-cz-mono text-[10px] text-cz-ink-3">{s.period}</div>
              <div className="font-cz-mono text-[10px]" style={{ color: "var(--cz-critical)" }}>
                {s.cz}d
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1.5 font-cz-mono text-[10.5px] text-cz-ink-3">
          the gap has widened every month for {DIVERGENCE.weeks} weeks — the two positions have not
          agreed since February
        </div>
      </div>

      <div className="mt-3">
        {DIVERGENCE.signals.map(([k, v]) => (
          <div
            key={k}
            className="flex items-baseline justify-between border-b border-cz-grid py-1.5 text-[12.5px]"
          >
            <span className="text-cz-ink-2">{k}</span>
            <span className="cz-figure ml-2 flex-none">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 font-cz-mono text-[10.5px] text-cz-ink-3">
        this position is the owner&apos;s; it is not published to the contractor
      </div>
    </Panel>
  );
}

/** 2:20 — the money. Dollars and days, not a score. */
export function ExposurePanel() {
  return (
    <Panel eyebrow="Exposure — dollars and days" accent="var(--cz-accent-solid)">
      <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        <div>
          <div className="cz-eyebrow">Interest carry</div>
          <div className="cz-figure text-[22px] font-bold">
            ${EXPOSURE.carryPerDay.toLocaleString()}
          </div>
          <div className="text-[11.5px] text-cz-ink-2">per day, drawn</div>
        </div>
        <div>
          <div className="cz-eyebrow">Days exposed</div>
          <div className="cz-figure text-[22px] font-bold">{EXPOSURE.daysExposed}</div>
          <div className="text-[11.5px] text-cz-ink-2">independent delay position</div>
        </div>
        <div>
          <div className="cz-eyebrow">Exposure</div>
          <div className="cz-figure text-[22px] font-bold" style={{ color: "var(--cz-critical)" }}>
            ${EXPOSURE.total.toLocaleString()}
          </div>
          <div className="text-[11.5px] text-cz-ink-2">carry alone, before any claim</div>
        </div>
      </div>
      <div className="mt-2.5 font-cz-mono text-[11px]" style={{ color: "var(--cz-accent)" }}>
        {EXPOSURE.feeLine}
      </div>
    </Panel>
  );
}

export function FindingRow({ f }: { f: DemoFinding }) {
  const [open, setOpen] = useState(false);
  const color =
    f.severity === "CRITICAL"
      ? "var(--cz-critical)"
      : f.severity === "SERIOUS"
        ? "var(--cz-serious)"
        : "var(--cz-warn-ink)";
  return (
    <div className="border-b border-cz-grid py-2.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-cz-mono text-[10px] tracking-[0.08em]" style={{ color }}>
          {f.severity}
        </span>
        <b className="text-[13px]">{f.headline}</b>
      </div>
      <div className="mt-0.5 text-[12.5px] text-cz-ink-2">{f.detail}</div>
      <div className="mt-1 flex flex-wrap items-center gap-2 font-cz-mono text-[10.5px] text-cz-ink-3">
        <span>{f.rule}</span>
        <span>· {f.control_id}</span>
        <span>· {f.aspect_id} {f.aspect_name}</span>
        <span>· status {f.status}</span>
        <CzButton className="ml-auto" onClick={() => setOpen(true)}>
          Source →
        </CzButton>
      </div>
      <SourceDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={`${f.control_id} · ${f.aspect_name}`}
        source={f.source}
      />
    </div>
  );
}

export function FindingsPanel() {
  return (
    <Panel eyebrow="Findings on this project">
      <div className="mt-1">
        {DEMO_FINDINGS.map((f) => (
          <FindingRow key={f.id} f={f} />
        ))}
      </div>
    </Panel>
  );
}
