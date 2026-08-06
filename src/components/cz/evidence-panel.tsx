// Evidence capture panel — attach the document, cite the page and clause, quote
// the operative sentence, and bind it to the control in one motion.

import { useState } from "react";
import { CzButton } from "@/components/cz/primitives";
import { useAuth } from "@/hooks/useAuth";
import {
  CONFIDENCES,
  CONFIDENCE_COLOR,
  SOURCE_CLASSES,
  createEvidence,
  deleteEvidence,
  fileSize,
  signedEvidenceUrl,
  uploadEvidenceFile,
  type ControlEvidence,
  type EvidenceConfidence,
  type SourceClass,
} from "@/lib/claimzero/evidence";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-2 py-[2px] font-cz-mono text-[9.5px] tracking-[0.04em]"
      style={
        active
          ? {
              borderColor: "var(--cz-accent-solid)",
              background: "color-mix(in srgb, var(--cz-accent) 16%, transparent)",
              color: "var(--cz-ink-1)",
            }
          : { borderColor: "var(--cz-grid)", color: "var(--cz-ink-3)" }
      }
    >
      {children}
    </button>
  );
}

const input =
  "w-full rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 text-[12.5px] outline-none focus:border-cz-accent";

export function EvidencePanel({
  projectId,
  controlId,
  items,
  onChanged,
  onVerify,
}: {
  projectId: number;
  controlId: string;
  items: ControlEvidence[];
  onChanged: () => void | Promise<void>;
  onVerify: (ref: string) => void | Promise<void>;
}) {
  const { user, profile } = useAuth();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [docDate, setDocDate] = useState("");
  const [page, setPage] = useState("");
  const [clause, setClause] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [sourceClass, setSourceClass] = useState<SourceClass>("CONTEMPORANEOUS_PROJECT_RECORD");
  const [confidence, setConfidence] = useState<EvidenceConfidence>("FULL");

  const reset = () => {
    setFile(null);
    setDocName("");
    setDocDate("");
    setPage("");
    setClause("");
    setExcerpt("");
    setSourceClass("CONTEMPORANEOUS_PROJECT_RECORD");
    setConfidence("FULL");
  };

  const submit = async () => {
    if (!docName.trim() && !file) {
      setErr("Attach a document or name the record.");
      return;
    }
    if (!excerpt.trim()) {
      setErr("Quote the operative sentence — a paraphrase is not evidence.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      let path = "";
      let size = 0;
      let mime = "";
      if (file) {
        const up = await uploadEvidenceFile(projectId, controlId, file);
        path = up.path;
        size = up.size;
        mime = up.type;
      }
      await createEvidence({
        project_id: projectId,
        control_id: controlId,
        document_name: docName.trim() || file?.name || "Untitled record",
        storage_path: path,
        file_size: size,
        mime_type: mime,
        page_ref: page.trim(),
        clause_ref: clause.trim(),
        excerpt: excerpt.trim(),
        source_class: sourceClass,
        confidence,
        document_date: docDate || null,
        captured_by: user?.id ?? null,
        captured_by_name: profile?.full_name || user?.email || "",
      });
      reset();
      setAdding(false);
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unable to save the evidence");
    } finally {
      setBusy(false);
    }
  };

  const open = async (item: ControlEvidence) => {
    const url = await signedEvidenceUrl(item.storage_path);
    if (url) window.open(url, "_blank", "noopener");
  };

  const remove = async (item: ControlEvidence) => {
    setBusy(true);
    try {
      await deleteEvidence(item);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-[8px] border border-cz-rule bg-cz-surface px-3.5 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="cz-eyebrow text-[9px]">
          Evidence bound to this control ({items.length})
        </div>
        <CzButton onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "+ Capture evidence"}
        </CzButton>
      </div>

      {items.length === 0 && !adding && (
        <div className="mt-1.5 text-[12.5px] text-cz-ink-2">
          No document is bound to this control yet.
        </div>
      )}

      {items.length > 0 && (
        <ul className="mt-2 space-y-2">
          {items.map((it) => (
            <li key={it.id} className="rounded-[6px] border border-cz-grid bg-cz-bg px-3 py-2">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <b className="text-[12.5px]">{it.document_name}</b>
                {it.page_ref && (
                  <span className="font-cz-mono text-[10.5px] text-cz-ink-3">{it.page_ref}</span>
                )}
                {it.clause_ref && (
                  <span className="font-cz-mono text-[10.5px] text-cz-ink-3">
                    cl. {it.clause_ref}
                  </span>
                )}
                {it.document_date && (
                  <span className="font-cz-mono text-[10.5px] text-cz-ink-3">
                    {it.document_date}
                  </span>
                )}
                <span
                  className="ml-auto font-cz-mono text-[9.5px]"
                  style={{ color: CONFIDENCE_COLOR[it.confidence] }}
                >
                  {it.confidence}
                </span>
              </div>
              {it.excerpt && (
                <p
                  className="mt-1.5 font-cz-mono text-[11.5px] leading-[1.7] text-cz-ink-1"
                  style={{
                    background: "color-mix(in srgb, var(--cz-accent-solid) 14%, transparent)",
                    borderLeft: "3px solid var(--cz-accent-solid)",
                    padding: "6px 9px",
                  }}
                >
                  {it.excerpt}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-2 font-cz-mono text-[9.5px] text-cz-ink-3">
                <span>{it.source_class}</span>
                {it.storage_path && <span>· {fileSize(it.file_size)}</span>}
                {it.captured_by_name && <span>· captured by {it.captured_by_name}</span>}
                <span className="ml-auto flex gap-1.5">
                  {it.storage_path && (
                    <CzButton onClick={() => void open(it)}>Open document</CzButton>
                  )}
                  <CzButton
                    primary
                    onClick={() =>
                      void onVerify(
                        `${it.document_name}${it.page_ref ? ` · ${it.page_ref}` : ""}${
                          it.clause_ref ? ` · cl. ${it.clause_ref}` : ""
                        }`,
                      )
                    }
                  >
                    Verify with this
                  </CzButton>
                  <CzButton disabled={busy} onClick={() => void remove(it)}>
                    Remove
                  </CzButton>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="mt-3 space-y-2 border-t border-cz-grid pt-3">
          <input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f && !docName) setDocName(f.name);
            }}
            className="w-full font-cz-mono text-[11px] text-cz-ink-2 file:mr-2 file:rounded-[4px] file:border file:border-cz-grid file:bg-cz-bg file:px-2 file:py-1 file:font-cz-mono file:text-[10px] file:text-cz-ink-1"
          />
          <div className="grid gap-2 md:grid-cols-2">
            <input
              className={input}
              placeholder="Document name"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />
            <input
              className={input}
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
            />
            <input
              className={input}
              placeholder="Page reference (e.g. p. 14)"
              value={page}
              onChange={(e) => setPage(e.target.value)}
            />
            <input
              className={input}
              placeholder="Clause / section reference"
              value={clause}
              onChange={(e) => setClause(e.target.value)}
            />
          </div>
          <textarea
            className={`${input} h-20`}
            placeholder="Quote the operative sentence verbatim — never a paraphrase"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="cz-eyebrow mr-1 text-[9px]">Source class</span>
            {SOURCE_CLASSES.map((s) => (
              <Chip key={s} active={sourceClass === s} onClick={() => setSourceClass(s)}>
                {s}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="cz-eyebrow mr-1 text-[9px]">Confidence</span>
            {CONFIDENCES.map((c) => (
              <Chip key={c} active={confidence === c} onClick={() => setConfidence(c)}>
                {c}
              </Chip>
            ))}
          </div>
          {err && (
            <p className="font-cz-mono text-[10.5px]" style={{ color: "var(--cz-critical)" }}>
              {err}
            </p>
          )}
          <CzButton primary disabled={busy} onClick={() => void submit()}>
            {busy ? "Saving…" : "Bind evidence to control"}
          </CzButton>
        </div>
      )}
    </div>
  );
}
