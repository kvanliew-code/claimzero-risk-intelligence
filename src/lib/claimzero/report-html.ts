// Canonical HTML for a generated report. This is the single print surface:
// the server renders it from the stored payload so an exported document can
// never drift from the snapshot it was published against. No client-side PDF.

import type { GeneratedReport, ReportSection } from "./reports";

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const rows = (cells: string[], tag: "td" | "th" = "td") =>
  `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join("")}</tr>`;

function sectionHtml(s: ReportSection): string {
  const h = `<h2>${esc(s.title)}</h2>`;
  switch (s.type) {
    case "narrative":
      return h + s.body.map((p) => `<p>${esc(p)}</p>`).join("");
    case "aspect_summary": {
      const head = s.withheldReason
        ? `<p class="withheld">${esc(s.withheldReason)}</p>`
        : `<p class="figure">${esc(s.index ?? "—")}<span> composite index · confidence ${esc(s.confidence)}% · ${esc(s.band)}</span></p>`;
      const body = s.rows
        .map((r) =>
          rows([
            esc(r.aspect_id),
            esc(r.aspect_name),
            r.score === null ? "not yet applicable" : esc(r.score),
            esc(r.band),
            `${esc(r.verified)}/${esc(r.controls)}`,
          ]),
        )
        .join("");
      return `${h}${head}<table><thead>${rows(["Aspect", "Name", "Score", "Band", "Verified"], "th")}</thead><tbody>${body}</tbody></table>`;
    }
    case "control_table": {
      const head = rows(
        s.columns.map((c) => esc(c.label)),
        "th",
      );
      const body = s.groups
        .map(
          (g) =>
            `<tr class="grp"><td colspan="${s.columns.length}">${esc(g.label)}</td></tr>` +
            g.rows
              .map((r) => rows(s.columns.map((c) => esc(r[c.key] ?? "—"))))
              .join(""),
        )
        .join("");
      return `${h}<table><thead>${head}</thead><tbody>${body || rows(["No rows"])}</tbody></table>`;
    }
    case "exit_criteria_status": {
      const block = (label: string, list: typeof s.hard) =>
        `<h3>${label}</h3><table><thead>${rows(["ID", "Criterion", "Evidence required", "Status", "Open controls"], "th")}</thead><tbody>${
          list.length
            ? list
                .map((c) =>
                  rows([
                    esc(c.criterion_id),
                    esc(c.exit_criterion),
                    esc(c.evidence_required),
                    c.satisfied ? "Satisfied" : "Open",
                    esc(c.open.join(", ") || "—"),
                  ]),
                )
                .join("")
            : rows(["—", "No criteria configured", "—", "—", "—"])
        }</tbody></table>`;
      return h + block("HARD — blocking", s.hard) + block("SOFT — non-blocking", s.soft);
    }
    case "finding_list":
      return (
        h +
        (s.items.length
          ? s.items
              .map(
                (i) =>
                  `<div class="finding"><b>${esc(i.headline)}</b> <span class="sev">${esc(i.severity)}</span><p>${esc(i.detail)}</p><p class="cons">Consequence: ${esc(i.consequence)}</p></div>`,
              )
              .join("")
          : "<p>None recorded.</p>")
      );
    case "chronology":
      return `${h}<table><thead>${rows(["Date", "Event", "Owner", "Source"], "th")}</thead><tbody>${
        s.entries.length
          ? s.entries
              .map((e) => rows([esc(e.date), esc(e.event), esc(e.owner), esc(e.source)]))
              .join("")
          : rows(["—", "No dated entries", "—", "—"])
      }</tbody></table>`;
    case "metric_grid":
      return (
        h +
        (s.note ? `<p class="withheld">${esc(s.note)}</p>` : "") +
        `<div class="metrics">${s.metrics
          .map(
            (m) =>
              `<div class="metric"><span class="mlabel">${esc(m.label)}</span><span class="mval t-${esc(m.tone)}">${esc(m.value)}</span><span class="msub">${esc(m.sub)}</span></div>`,
          )
          .join("")}</div>`
      );
    case "grade_card":
      return (
        h +
        (s.note ? `<p class="cons">${esc(s.note)}</p>` : "") +
        `<table><thead>${rows(["Stage", "Phase", "State", "KPI", "Verified", "Complete", "Grade"], "th")}</thead><tbody>${s.rows
          .map(
            (r) =>
              `<tr><td>${esc(r.stage)}</td><td><b>${esc(r.phase)}</b></td><td>${esc(r.state)}</td><td>${esc(r.kpi)}</td><td>${esc(r.verified)}/${esc(r.applicable)}</td><td>${esc(r.completeness)}%</td><td class="grade t-${esc(r.tone)}">${esc(r.grade)}</td></tr>`,
          )
          .join("")}</tbody></table>`
      );
    case "signature_block":
      return `${h}<p>${esc(s.statement)}</p>${s.signatories
        .map(
          (r) =>
            `<div class="sig"><span class="line"></span><span class="role">${esc(r)} — name, signature, date</span></div>`,
        )
        .join("")}`;

    default:
      return h;
  }
}

export function reportToHtml(
  report: GeneratedReport,
  extra: { contentHash?: string | null; publishedAt?: string | null } = {},
): string {
  const m = report.meta;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>${esc(m.title)} — ${esc(m.project_name)}</title>
<style>
  @page { margin: 18mm; }
  body { font: 12px/1.55 Georgia, "Times New Roman", serif; color: #14202c; margin: 0; }
  header { border-bottom: 2px solid #c9622f; padding-bottom: 10px; margin-bottom: 16px;
           display: flex; justify-content: space-between; gap: 20px; }
  h1 { font: 700 18px/1.2 Helvetica, Arial, sans-serif; margin: 0 0 4px; }
  .meta { font: 10px/1.5 "Courier New", monospace; letter-spacing: .08em; text-transform: uppercase; color: #5a6773; }
  .brand { font: 700 15px Helvetica, Arial, sans-serif; white-space: nowrap; }
  .brand span { color: #c9622f; }
  h2 { font: 700 10px/1.4 "Courier New", monospace; letter-spacing: .16em; text-transform: uppercase;
       color: #c9622f; margin: 20px 0 6px; }
  h3 { font: 700 11px Helvetica, Arial, sans-serif; margin: 12px 0 4px; }
  p { margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; font-size: 11px; }
  th { text-align: left; border-bottom: 1px solid #5a6773; padding: 5px 6px;
       font: 700 9px "Courier New", monospace; letter-spacing: .1em; text-transform: uppercase; }
  td { border-bottom: 1px solid #e3e7ea; padding: 5px 6px; vertical-align: top; }
  tr.grp td { background: #f2f4f6; font: 700 10px Helvetica, Arial, sans-serif; letter-spacing: .04em; }
  .figure { font: 700 26px Helvetica, Arial, sans-serif; }
  .figure span { font: 400 12px Georgia, serif; }
  .withheld { border-left: 3px solid #c9622f; padding-left: 10px; }
  .finding { border-left: 2px solid #e3e7ea; padding-left: 10px; margin-bottom: 8px; }
  .sev { font: 700 9px "Courier New", monospace; letter-spacing: .08em; text-transform: uppercase; color: #a33; }
  .cons { font-size: 11px; color: #5a6773; }
  .sig { margin: 18px 0 0; }
  .line { display: block; border-bottom: 1px solid #14202c; width: 320px; height: 22px; }
  .role { font: 9px "Courier New", monospace; letter-spacing: .08em; text-transform: uppercase; color: #5a6773; }
  .unresolved li { margin-bottom: 4px; }
  footer { margin-top: 22px; border-top: 1px solid #e3e7ea; padding-top: 8px;
           font: 9px "Courier New", monospace; letter-spacing: .08em; text-transform: uppercase; color: #5a6773;
           display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
</style></head><body>
<header>
  <div>
    <h1>${esc(m.title)}</h1>
    <div class="meta">${esc(m.project_name)} · ${esc(m.project_location)} · Stage ${esc(m.stage_number)} ${esc(m.stage_name)} · Issued ${esc(m.issued)}</div>
    <div class="meta">Document ${esc(m.doc_number)} · Revision ${esc(m.revision)}${m.controlled ? " · CONTROLLED DOCUMENT" : ""} · Audience: ${esc(m.audience)}</div>
  </div>
  <div class="brand">Claim<span>Zero</span></div>
</header>
${report.sections.map(sectionHtml).join("\n")}
${
  report.unresolvedInputs.length
    ? `<h2>Unresolved inputs</h2><ul class="unresolved">${report.unresolvedInputs
        .map((u) => `<li>${esc(u)}</li>`)
        .join("")}</ul>`
    : ""
}
<h2>Citations</h2>
<table><thead>${rows(["Control", "Cited record", "Expected evidence"], "th")}</thead><tbody>${
    report.citations.length
      ? report.citations
          .map((c) => rows([esc(c.control_id ?? "—"), esc(c.ref), esc(c.document ?? "—")]))
          .join("")
      : rows(["—", "No citations captured", "—"])
  }</tbody></table>
<footer>
  <span>Confidence ${esc(report.confidence)}%${extra.publishedAt ? ` · Published ${esc(new Date(extra.publishedAt).toUTCString())}` : ""}</span>
  <span>${extra.contentHash ? `Snapshot ${esc(extra.contentHash.slice(0, 16))}…` : "UNPUBLISHED — NOT FOR ISSUE"}</span>
</footer>
</body></html>`;
}
