// On-screen rendering of the typed section primitives. The same GeneratedReport
// payload drives this and the server-side canonical HTML, so what a reviewer
// approves is what a third party receives.

import { Fragment } from "react";
import type { GeneratedReport, Remedy, ReportSection } from "@/lib/claimzero/reports";


const thCls =
  "border-b border-cz-ink-3/50 px-2 py-[7px] text-left font-cz-mono text-[9.5px] tracking-[0.12em] uppercase text-cz-ink-3";
const tdCls = "border-b border-cz-grid px-2 py-2 align-top";

function H4({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="cz-eyebrow mt-5 mb-1.5 tracking-[0.16em]" style={{ color: "var(--cz-accent)" }}>
      {children}
    </h4>
  );
}

function Section({ s }: { s: ReportSection }) {
  switch (s.type) {
    case "narrative":
      return (
        <>
          <H4>{s.title}</H4>
          {s.body.map((p, i) => (
            <p key={i} className="mb-2 font-cz-serif text-[13px] leading-[1.6] text-cz-ink-2">
              {p}
            </p>
          ))}
        </>
      );

    case "aspect_summary":
      return (
        <>
          <H4>{s.title}</H4>
          {s.withheldReason ? (
            <p
              className="mb-2 border-l-2 pl-3 font-cz-serif text-[13px] text-cz-ink-2"
              style={{ borderColor: "var(--cz-accent-solid)" }}
            >
              {s.withheldReason}
            </p>
          ) : (
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="cz-figure text-[28px] font-bold">{s.index ?? "—"}</span>
              <span className="font-cz-serif text-[13px] text-cz-ink-2">
                composite index · confidence {s.confidence}% · {s.band}
              </span>
            </div>
          )}
          <table className="my-2 w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                {["Aspect", "Name", "Score", "Band", "Verified"].map((h) => (
                  <th key={h} className={thCls}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.aspect_id}>
                  <td className={`${tdCls} font-cz-mono`}>{r.aspect_id}</td>
                  <td className={tdCls}>{r.aspect_name}</td>
                  <td className={`${tdCls} font-cz-mono`}>
                    {r.score === null ? "not yet applicable" : r.score}
                  </td>
                  <td className={`${tdCls} font-cz-mono`}>{r.band}</td>
                  <td className={`${tdCls} font-cz-mono`}>
                    {r.verified}/{r.controls}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );

    case "control_table":
      return (
        <>
          <H4>{s.title}</H4>
          <table className="my-2 w-full border-collapse text-[12px]">
            <thead>
              <tr>
                {s.columns.map((c) => (
                  <th key={c.key} className={thCls}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.groups.map((g) => (
                <>
                  <tr key={g.label} className="bg-cz-grid/40">
                    <td
                      className={`${tdCls} font-cz-sans text-[11.5px] font-semibold`}
                      colSpan={s.columns.length}
                    >
                      {g.label}
                    </td>
                  </tr>
                  {g.rows.map((r, i) => (
                    <tr key={`${g.label}-${i}`}>
                      {s.columns.map((c) => (
                        <td
                          key={c.key}
                          className={`${tdCls} ${c.key === "control_id" ? "font-cz-mono whitespace-nowrap" : "font-cz-serif"}`}
                        >
                          {r[c.key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {g.rows.length === 0 ? (
                    <tr key={`${g.label}-empty`}>
                      <td className={`${tdCls} text-cz-ink-3`} colSpan={s.columns.length}>
                        Nothing open in this group.
                      </td>
                    </tr>
                  ) : null}
                </>
              ))}
            </tbody>
          </table>
        </>
      );

    case "exit_criteria_status": {
      const block = (label: string, list: typeof s.hard) => (
        <>
          <div className="cz-eyebrow mt-3 mb-1 tracking-[0.12em] text-cz-ink-3">{label}</div>
          <table className="mb-2 w-full border-collapse text-[12px]">
            <thead>
              <tr>
                {["ID", "Criterion", "Evidence required", "Status", "Open controls"].map((h) => (
                  <th key={h} className={thCls}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.length ? (
                list.map((c) => (
                  <tr key={c.criterion_id}>
                    <td className={`${tdCls} font-cz-mono whitespace-nowrap`}>{c.criterion_id}</td>
                    <td className={`${tdCls} font-cz-serif`}>{c.exit_criterion}</td>
                    <td className={`${tdCls} font-cz-serif`}>{c.evidence_required}</td>
                    <td
                      className={`${tdCls} font-cz-mono`}
                      style={{ color: c.satisfied ? "var(--cz-good)" : "var(--cz-critical)" }}
                    >
                      {c.satisfied ? "SATISFIED" : "OPEN"}
                    </td>
                    <td className={`${tdCls} font-cz-mono text-[11px]`}>
                      {c.open.join(", ") || "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className={`${tdCls} text-cz-ink-3`} colSpan={5}>
                    No criteria configured at this stage.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      );
      return (
        <>
          <H4>{s.title}</H4>
          {block("HARD — blocking", s.hard)}
          {block("SOFT — non-blocking", s.soft)}
        </>
      );
    }

    case "finding_list":
      return (
        <>
          <H4>{s.title}</H4>
          {s.items.length ? (
            s.items.map((i, k) => (
              <div key={k} className="mb-2.5 border-l-2 border-cz-grid pl-3">
                <div className="font-cz-sans text-[12.5px] font-semibold">
                  {i.headline}{" "}
                  <span className="font-cz-mono text-[9.5px] tracking-[0.08em] uppercase text-cz-ink-3">
                    {i.severity}
                  </span>
                </div>
                <p className="font-cz-serif text-[12.5px] text-cz-ink-2">{i.detail}</p>
                <p className="font-cz-serif text-[12px] text-cz-ink-3">
                  Consequence: {i.consequence}
                </p>
                <RemedyBlock remedy={i.remedy} />
              </div>
            ))
          ) : (
            <p className="font-cz-serif text-[13px] text-cz-ink-3">None recorded.</p>
          )}
        </>
      );

    case "transcript": {
      const t = s.termGrade;
      const toneColor = (tn: string) =>
        tn === "good"
          ? "var(--cz-good)"
          : tn === "warn"
            ? "var(--cz-warn, #b8860b)"
            : tn === "bad"
              ? "var(--cz-critical)"
              : "var(--cz-ink-3, inherit)";
      return (
        <>
          <H4>{s.title}</H4>
          {s.note ? (
            <p className="mb-2 font-cz-serif text-[12.5px] text-cz-ink-3">{s.note}</p>
          ) : null}
          <table className="my-2 w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                {["Subject", "Owner question", "Credits", "Verified", "Mark", "Grade", "Points"].map(
                  (hd) => (
                    <th key={hd} className={thCls}>
                      {hd}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {s.subjects.map((r) => (
                <Fragment key={r.aspect_id}>
                  <tr>
                    <td className={`${tdCls} font-cz-sans`}>
                      <span className="font-cz-mono text-[11px]">{r.aspect_id}</span>{" "}
                      <span className="font-semibold">{r.aspect_name}</span>
                    </td>
                    <td className={`${tdCls} font-cz-serif`}>{r.owner_question}</td>
                    <td className={`${tdCls} font-cz-mono`}>
                      {r.mark === null ? "—" : r.credits.toFixed(1)}
                    </td>
                    <td className={`${tdCls} font-cz-mono`}>
                      {r.verified}/{r.controls}
                    </td>
                    <td className={`${tdCls} font-cz-mono`}>
                      {r.mark === null ? "N/A" : `${r.mark}%`}
                    </td>
                    <td
                      className={`${tdCls} font-cz-sans text-[15px] font-bold`}
                      style={{ color: toneColor(r.tone) }}
                    >
                      {r.letter}
                    </td>
                    <td className={`${tdCls} font-cz-mono`}>
                      {r.gradePoints === null ? "—" : r.gradePoints.toFixed(2)}
                    </td>
                  </tr>
                  {r.remedy ? (
                    <tr>
                      <td className={tdCls} colSpan={7}>
                        <RemedyBlock remedy={r.remedy} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
          <div className="mt-3 border-t-2 border-cz-accent pt-2 font-cz-serif text-[12.5px]">
            <span className="font-cz-mono text-[9.5px] tracking-[0.12em] uppercase text-cz-accent">
              Term grade
            </span>{" "}
            <span
              className="font-cz-sans text-[17px] font-bold"
              style={{ color: toneColor(t.tone) }}
            >
              {t.letter}
            </span>{" "}
            <b>{t.mark === null ? "N/A" : `${t.mark}%`}</b> · Control GPA{" "}
            <b>{t.gpa === null ? "—" : t.gpa.toFixed(2)}</b> / 4.00 · {t.credits.toFixed(1)} credits
            across {t.subjectsGraded} graded subjects · {t.subjectsNotApplicable} not applicable and
            excluded
          </div>
        </>
      );
    }


    case "chronology":
      return (
        <>
          <H4>{s.title}</H4>
          <table className="my-2 w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                {["Date", "Event", "Owner", "Source"].map((h) => (
                  <th key={h} className={thCls}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.entries.length ? (
                s.entries.map((e, i) => (
                  <tr key={i}>
                    <td className={`${tdCls} font-cz-mono whitespace-nowrap`}>{e.date}</td>
                    <td className={`${tdCls} font-cz-serif`}>{e.event}</td>
                    <td className={tdCls}>{e.owner}</td>
                    <td className={`${tdCls} font-cz-mono text-[11px]`}>{e.source}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className={`${tdCls} text-cz-ink-3`} colSpan={4}>
                    No dated entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      );

    case "metric_grid": {
      const toneColor = (t: string) =>
        t === "good"
          ? "var(--cz-good)"
          : t === "warn"
            ? "var(--cz-warn, #b8860b)"
            : t === "bad"
              ? "var(--cz-critical)"
              : "inherit";
      return (
        <>
          <H4>{s.title}</H4>
          {s.note ? (
            <p
              className="mb-2 border-l-2 pl-3 font-cz-serif text-[12.5px] text-cz-ink-2"
              style={{ borderColor: "var(--cz-accent-solid)" }}
            >
              {s.note}
            </p>
          ) : null}
          <div className="my-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {s.metrics.map((m) => (
              <div key={m.label} className="rounded border border-cz-grid px-3 py-2.5">
                <div className="cz-eyebrow tracking-[0.12em] text-cz-ink-3">{m.label}</div>
                <div
                  className="cz-figure mt-1 text-[17px] font-bold"
                  style={{ color: toneColor(m.tone) }}
                >
                  {m.value}
                </div>
                <div className="mt-0.5 font-cz-serif text-[11.5px] leading-[1.45] text-cz-ink-3">
                  {m.sub}
                </div>
              </div>
            ))}
          </div>
        </>
      );
    }

    case "grade_card": {
      const toneColor = (t: string) =>
        t === "good"
          ? "var(--cz-good)"
          : t === "warn"
            ? "var(--cz-warn, #b8860b)"
            : t === "bad"
              ? "var(--cz-critical)"
              : "var(--cz-ink-3, inherit)";
      return (
        <>
          <H4>{s.title}</H4>
          {s.note ? (
            <p className="mb-2 font-cz-serif text-[12.5px] text-cz-ink-3">{s.note}</p>
          ) : null}
          <table className="my-2 w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                {["Stage", "Phase", "State", "KPI", "Verified", "Complete", "Grade"].map((h) => (
                  <th key={h} className={thCls}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.stage}>
                  <td className={`${tdCls} font-cz-mono`}>{r.stage}</td>
                  <td className={`${tdCls} font-cz-sans font-semibold`}>{r.phase}</td>
                  <td className={`${tdCls} font-cz-mono text-[11px]`}>{r.state}</td>
                  <td className={`${tdCls} font-cz-serif`}>{r.kpi}</td>
                  <td className={`${tdCls} font-cz-mono`}>
                    {r.verified}/{r.applicable}
                  </td>
                  <td className={`${tdCls} font-cz-mono`}>{r.completeness}%</td>
                  <td
                    className={`${tdCls} font-cz-sans text-[15px] font-bold`}
                    style={{ color: toneColor(r.tone) }}
                  >
                    {r.grade}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
    }

    case "signature_block":
      return (
        <>
          <H4>{s.title}</H4>
          <p className="font-cz-serif text-[13px] text-cz-ink-2">{s.statement}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {s.signatories.map((r) => (
              <div key={r}>
                <div className="h-6 border-b border-cz-ink-2" />
                <div className="cz-eyebrow mt-1 tracking-[0.1em] text-cz-ink-3">
                  {r} — name, signature, date
                </div>
              </div>
            ))}
          </div>
        </>
      );


    default:
      return null;
  }
}

export function ReportDoc({ report }: { report: GeneratedReport }) {
  const m = report.meta;
  return (
    <div className="cz-print-doc mx-5 my-4 max-w-[900px] rounded-lg border border-cz-rule bg-cz-surface px-[30px] py-[26px]">
      <div
        className="mb-3.5 flex items-start justify-between gap-4 pb-3"
        style={{ borderBottom: "2px solid var(--cz-accent-solid)" }}
      >
        <div>
          <h2 className="font-cz-sans text-[17px] font-bold">{m.title}</h2>
          <div className="cz-eyebrow mt-1 tracking-[0.12em]">
            {m.project_name} · {m.project_location} · Stage {m.stage_number} {m.stage_name} ·
            Issued {m.issued}
          </div>
          <div className="cz-eyebrow mt-0.5 tracking-[0.12em] text-cz-ink-3">
            Document {m.doc_number} · Rev {m.revision}
            {m.controlled ? " · Controlled document" : ""} · Audience: {m.audience}
          </div>
        </div>
        <div className="font-cz-sans text-[15px] font-bold whitespace-nowrap">
          Claim<span style={{ color: "var(--cz-accent)" }}>Zero</span>
        </div>
      </div>

      {report.sections.map((s, i) => (
        <Section key={`${s.type}-${i}`} s={s} />
      ))}

      {report.unresolvedInputs.length ? (
        <>
          <H4>Unresolved inputs</H4>
          <ul className="list-disc pl-5 font-cz-serif text-[12.5px] text-cz-ink-2">
            {report.unresolvedInputs.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </>
      ) : null}

      <H4>Citations</H4>
      <table className="my-2 w-full border-collapse text-[12px]">
        <thead>
          <tr>
            {["Control", "Cited record", "Expected evidence"].map((h) => (
              <th key={h} className={thCls}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.citations.slice(0, 60).map((c, i) => (
            <tr key={i}>
              <td className={`${tdCls} font-cz-mono whitespace-nowrap`}>{c.control_id ?? "—"}</td>
              <td className={`${tdCls} font-cz-serif`}>{c.ref}</td>
              <td className={`${tdCls} font-cz-serif`}>{c.document ?? "—"}</td>
            </tr>
          ))}
          {report.citations.length === 0 ? (
            <tr>
              <td className={`${tdCls} text-cz-ink-3`} colSpan={3}>
                No citations captured.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap justify-between gap-1.5 border-t border-cz-grid pt-2.5 font-cz-mono text-[9.5px] tracking-[0.08em] text-cz-ink-3">
        <span>CONFIDENCE {report.confidence}%</span>
        <span>
          {report.citations.length} CITED RECORDS · {report.unresolvedInputs.length} UNRESOLVED
          INPUTS
        </span>
      </div>
    </div>
  );
}
