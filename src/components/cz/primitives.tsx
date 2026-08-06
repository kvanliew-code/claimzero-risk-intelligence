import type { ReactNode } from "react";
import { STATUS, statusOf, type StatusName } from "@/lib/claimzero/data";

export function StatusPill({ status }: { status: StatusName }) {
  const s = STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-cz-mono text-[10px] font-bold tracking-[0.08em] uppercase"
      style={{
        background: s.varName,
        color: status === "Watch" ? "#3a2c00" : "#fff",
      }}
    >
      {s.icon} {status}
    </span>
  );
}

export function scoreColor(score: number) {
  const st = statusOf(score);
  return st === "Watch" ? "var(--cz-warn-ink)" : STATUS[st].varName;
}

export function TrendTag({ d }: { d: number }) {
  if (d > 2)
    return (
      <span className="font-cz-mono font-bold" style={{ color: "var(--cz-critical)" }}>
        ▲ +{d}
      </span>
    );
  if (d < -2)
    return (
      <span className="font-cz-mono font-bold" style={{ color: "var(--cz-good)" }}>
        ▼ {d}
      </span>
    );
  return (
    <span className="font-cz-mono font-bold text-cz-ink-3">
      — {d >= 0 ? "+" : ""}
      {d}
    </span>
  );
}

export function Sparkline({ data, w = 88, h = 26 }: { data: number[]; w?: number; h?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rg = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((v - min) / rg) * (h - 7)}`)
    .join(" ");
  const last = data[data.length - 1] as number;
  const ly = h - 3 - ((last - min) / rg) * (h - 7);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke="var(--cz-accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx={w}
        cy={ly}
        r="3"
        fill="var(--cz-accent)"
        stroke="var(--cz-surface)"
        strokeWidth="2"
      />
    </svg>
  );
}

export function Dial({ value }: { value: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative h-[104px] w-[104px] flex-none">
      <svg width="104" height="104" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={r} fill="none" stroke="var(--cz-grid)" strokeWidth="9" />
        <circle
          cx="52"
          cy="52"
          r={r}
          fill="none"
          stroke={STATUS[statusOf(value)].varName}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${(circ * (value / 100)).toFixed(1)} ${circ.toFixed(1)}`}
          transform="rotate(-90 52 52)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <b className="font-cz-mono text-[28px] leading-none">{value}</b>
        <span className="cz-eyebrow mt-1">Risk Index</span>
      </div>
    </div>
  );
}

export function CzButton({
  children,
  onClick,
  primary,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  primary?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`cursor-pointer rounded-md border px-3 py-1.5 font-cz-mono text-[11px] tracking-[0.06em] uppercase transition-colors ${
        primary
          ? "border-transparent font-semibold text-white"
          : "border-cz-grid bg-cz-surface text-cz-ink-1 hover:border-cz-accent"
      } ${className}`}
      style={primary ? { background: "var(--cz-accent-solid)" } : undefined}
    >
      {children}
    </button>
  );
}

export function Row3({
  a,
  b,
  c,
  highlight,
}: {
  a: ReactNode;
  b: ReactNode;
  c: ReactNode;
  highlight?: boolean | undefined;
}) {
  return (
    <div
      className={`flex items-baseline border-b border-cz-grid py-[5px] text-[12.5px] ${
        highlight ? "font-semibold" : ""
      }`}
    >
      <span className="flex-1">{a}</span>
      <span className="mx-2.5 flex-none font-cz-mono text-[11px] text-cz-ink-3">{b}</span>
      <span className="flex-none font-cz-mono text-[11px]">{c}</span>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/55 p-5"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[86vh] w-full max-w-[660px] overflow-auto rounded-xl border border-cz-rule bg-cz-surface p-6">
        {children}
      </div>
    </div>
  );
}

export function ReportShell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-cz-grid p-3.5 text-[12.5px]">{children}</div>
  );
}

export function ReportH({ children }: { children: ReactNode }) {
  return <h4 className="cz-eyebrow mt-3 mb-1 first:mt-0">{children}</h4>;
}

export function Gate({ children }: { children: ReactNode }) {
  return (
    <div
      className="mt-3.5 rounded-md px-2.5 py-2 text-[11.5px] text-cz-ink-2"
      style={{ background: "color-mix(in srgb, var(--cz-warn) 12%, transparent)" }}
    >
      {children}
    </div>
  );
}
