/**
 * ReportMotif — the sign-in artwork.
 *
 * Not decoration for its own sake: this is a scaled-down, non-interactive
 * rendering of the two artifacts the product actually produces — a Risk
 * Mitigation Plan page and the Weekly Intelligence digest strip behind it.
 * Everything on the sheets uses the same vocabulary as the live app (doc
 * number + revision, risk index, control IDs, status chips, declared exposure)
 * so the first screen shows the deliverable rather than a stock illustration.
 *
 * The sheets render on "paper" tokens, which is also what lifts the panel out
 * of the near-black it used to sit in.
 */

type Row = {
  control: string;
  family: string;
  label: string;
  status: string;
  tone: "good" | "warn" | "serious" | "critical";
};

const ROWS: Row[] = [
  {
    control: "S4-SCH-014",
    family: "SCH",
    label: "Baseline schedule accepted, native file held",
    status: "VERIFIED",
    tone: "good",
  },
  {
    control: "S4-CST-031",
    family: "CST",
    label: "Contingency draw log reconciled to pay app",
    status: "IN REVIEW",
    tone: "warn",
  },
  {
    control: "S4-DSN-007",
    family: "DSN",
    label: "Design freeze memo countersigned by architect",
    status: "NOT LOCATED",
    tone: "serious",
  },
  {
    control: "S4-PRC-022",
    family: "PRC",
    label: "Long-lead procurement release dated & signed",
    status: "BLOCKING",
    tone: "critical",
  },
];

const TONE_VAR: Record<Row["tone"], string> = {
  good: "var(--cz-good)",
  warn: "#9a6b00",
  serious: "#b8552a",
  critical: "var(--cz-critical)",
};

/* The index dial — same 0-100 scale the portfolio uses. */
function Dial({ value }: { value: number }) {
  const r = 26;
  const circumference = Math.PI * r; // half circle
  const filled = (value / 100) * circumference;
  return (
    <svg viewBox="0 0 70 42" className="h-[42px] w-[70px]" aria-hidden="true">
      <path
        d="M9 36 A26 26 0 0 1 61 36"
        fill="none"
        stroke="var(--cz-paper-rule)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M9 36 A26 26 0 0 1 61 36"
        fill="none"
        stroke="var(--cz-accent-solid)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
      />
    </svg>
  );
}

/* Behind sheet: the Monday digest strip, reduced to its bar chart. */
function DigestSheet() {
  const bars = [38, 52, 47, 61, 55, 72, 66, 81, 74, 88, 79, 93];
  return (
    <div className="w-[300px] rounded-[3px] bg-cz-paper-2 px-5 py-4 shadow-[0_24px_50px_-18px_rgba(0,0,0,0.65)]">
      <div className="flex items-baseline justify-between">
        <div
          className="font-cz-mono text-[8px] tracking-[0.2em]"
          style={{ color: "var(--cz-paper-ink-2)" }}
        >
          WEEKLY INTELLIGENCE
        </div>
        <div
          className="font-cz-mono text-[8px] tracking-[0.14em]"
          style={{ color: "var(--cz-paper-ink-2)" }}
        >
          CZ-WKI-0207 · R12
        </div>
      </div>
      <div
        className="mt-1 font-cz-sans text-[13px] font-bold"
        style={{ color: "var(--cz-paper-ink)" }}
      >
        Portfolio exposure trend
      </div>
      <div className="mt-3 flex h-[54px] items-end gap-[5px]">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-[1px]"
            style={{
              height: `${h}%`,
              background:
                i >= bars.length - 3
                  ? "var(--cz-accent-solid)"
                  : "color-mix(in srgb, var(--cz-paper-ink) 26%, transparent)",
            }}
          />
        ))}
      </div>
      <div
        className="mt-2 border-t pt-2 font-cz-mono text-[8px] tracking-[0.12em]"
        style={{ borderColor: "var(--cz-paper-rule)", color: "var(--cz-paper-ink-2)" }}
      >
        12 WEEKS · 63 PROJECTS · SOURCE-CITED
      </div>
    </div>
  );
}

/* Front sheet: a Risk Mitigation Plan page. */
function RmpSheet() {
  return (
    <div className="w-[360px] rounded-[3px] bg-cz-paper shadow-[0_38px_70px_-20px_rgba(0,0,0,0.75)]">
      {/* masthead */}
      <div
        className="flex items-start justify-between border-b px-6 pt-5 pb-3"
        style={{ borderColor: "var(--cz-paper-rule)" }}
      >
        <div>
          <div
            className="font-cz-sans text-[15px] leading-none font-extrabold"
            style={{ color: "var(--cz-paper-ink)" }}
          >
            Claim<span style={{ color: "var(--cz-accent-solid)" }}>Zero</span>
          </div>
          <div
            className="mt-1.5 font-cz-mono text-[8px] tracking-[0.2em]"
            style={{ color: "var(--cz-paper-ink-2)" }}
          >
            RISK MITIGATION PLAN
          </div>
        </div>
        <div
          className="text-right font-cz-mono text-[8px] leading-[1.7] tracking-[0.12em]"
          style={{ color: "var(--cz-paper-ink-2)" }}
        >
          CZ-RMP-0142 · R3
          <br />
          STAGE 4 · CONSTRUCTION
        </div>
      </div>

      {/* project + index */}
      <div className="flex items-center justify-between px-6 pt-4">
        <div>
          <div
            className="font-cz-serif text-[15px] leading-tight"
            style={{ color: "var(--cz-paper-ink)" }}
          >
            Harbor Point Residences
          </div>
          <div
            className="mt-1 font-cz-mono text-[8.5px] tracking-[0.12em]"
            style={{ color: "var(--cz-paper-ink-2)" }}
          >
            STANDARD TIER · 214 APPLICABLE CONTROLS
          </div>
        </div>
        <div className="flex flex-col items-center">
          <Dial value={68} />
          <div
            className="-mt-2 font-cz-mono text-[15px] font-bold"
            style={{ color: "var(--cz-paper-ink)" }}
          >
            68
          </div>
          <div
            className="font-cz-mono text-[7px] tracking-[0.2em]"
            style={{ color: "var(--cz-paper-ink-2)" }}
          >
            INDEX
          </div>
        </div>
      </div>

      {/* control rows */}
      <div className="mt-4 px-6">
        <div
          className="flex items-center justify-between border-y py-1.5 font-cz-mono text-[7.5px] tracking-[0.18em]"
          style={{ borderColor: "var(--cz-paper-rule)", color: "var(--cz-paper-ink-2)" }}
        >
          <span>CONTROL</span>
          <span>STATUS</span>
        </div>
        {ROWS.map((row) => (
          <div
            key={row.control}
            className="flex items-start justify-between gap-3 border-b py-2"
            style={{ borderColor: "var(--cz-paper-rule)" }}
          >
            <div className="min-w-0">
              <div
                className="font-cz-mono text-[8.5px] tracking-[0.1em]"
                style={{ color: "var(--cz-paper-ink-2)" }}
              >
                {row.control} · {row.family}
              </div>
              <div
                className="mt-0.5 truncate font-cz-serif text-[10.5px]"
                style={{ color: "var(--cz-paper-ink)" }}
              >
                {row.label}
              </div>
            </div>
            <span
              className="mt-0.5 shrink-0 rounded-[2px] px-1.5 py-[3px] font-cz-mono text-[7px] font-bold tracking-[0.12em]"
              style={{
                color: TONE_VAR[row.tone],
                background: `color-mix(in srgb, ${TONE_VAR[row.tone]} 14%, transparent)`,
              }}
            >
              {row.status}
            </span>
          </div>
        ))}
      </div>

      {/* declared exposure footer */}
      <div className="flex items-end justify-between px-6 pt-3 pb-5">
        <div>
          <div
            className="font-cz-mono text-[7.5px] tracking-[0.2em]"
            style={{ color: "var(--cz-paper-ink-2)" }}
          >
            DECLARED EXPOSURE
          </div>
          <div
            className="font-cz-mono text-[19px] leading-tight font-bold"
            style={{ color: "var(--cz-paper-ink)" }}
          >
            $4.28M
          </div>
        </div>
        <div
          className="text-right font-cz-mono text-[7.5px] leading-[1.8] tracking-[0.12em]"
          style={{ color: "var(--cz-paper-ink-2)" }}
        >
          REVIEWER APPROVED
          <br />
          07 AUG 2026
        </div>
      </div>
    </div>
  );
}

export function ReportMotif({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none relative flex items-center justify-center select-none ${className}`}
    >
      <div className="relative">
        <div className="absolute -top-28 -right-36 rotate-[7deg]">
          <DigestSheet />
        </div>
        <div className="relative rotate-[-2deg]">
          <RmpSheet />
        </div>
      </div>
    </div>
  );
}
