import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CzHeader } from "@/components/cz/header";
import { SHead } from "@/components/cz/shead";
import { CzButton, Gate, Modal, ReportH, ReportShell } from "@/components/cz/primitives";
import { supabase } from "@/integrations/supabase/client";
import type { ClientRow } from "./clients";

export const Route = createFileRoute("/_authenticated/engagements")({
  head: () => ({
    meta: [
      { title: "Engagements — ClaimZero Pipeline" },
      {
        name: "description",
        content:
          "Draft, send and sign ClaimZero engagement letters. Scope, fee tier by project size, term and signature block — only a signed engagement can open a project intake.",
      },
      { property: "og:title", content: "Engagements — ClaimZero Pipeline" },
      {
        property: "og:description",
        content: "Engagement letters from template: draft, sent, signed — the gate before intake.",
      },
    ],
  }),
  component: Engagements,
});

type Status = "draft" | "sent" | "signed";

const STATUS_LABEL: Record<Status, string> = { draft: "Draft", sent: "Sent", signed: "Signed" };

interface Engagement {
  id: string;
  client_id: string;
  project_name: string;
  size_m: number;
  scope: string;
  fee_tier: string;
  term: string;
  status: Status;
  signed_at: string | null;
}

export function feeTier(sizeM: number) {
  if (sizeM >= 400) return "Tier IV — $28,500 / month, portfolio review included";
  if (sizeM >= 200) return "Tier III — $22,000 / month";
  if (sizeM >= 75) return "Tier II — $16,500 / month";
  return "Tier I — $11,000 / month";
}

const DEFAULT_SCOPE =
  "Independent development risk intelligence: the thirty-aspect scoring model, the daily watch telemetry layer, a reviewed Weekly Top 10 issued Monday, an end-of-month executive report, and a maintained document register sufficient to produce the record if a claim arises.";

const STATUS_COLOR: Record<Status, string> = {
  draft: "var(--cz-ink-3)",
  sent: "var(--cz-warn)",
  signed: "var(--cz-good)",
};

function Engagements() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [rows, setRows] = useState<Engagement[]>([]);
  const [creating, setCreating] = useState(false);
  const [letter, setLetter] = useState<Engagement | null>(null);
  const [form, setForm] = useState({ client_id: "", project_name: "", size_m: 120 });

  const load = async () => {
    const [{ data: cs }, { data: es }] = await Promise.all([
      supabase.from("clients").select("id, company, primary_contact, contact_email, phone, status"),
      supabase
        .from("engagements")
        .select("id, client_id, project_name, size_m, scope, fee_tier, term, status, signed_at")
        .order("created_at", { ascending: false }),
    ]);
    setClients((cs as ClientRow[] | null) ?? []);
    setRows((es as Engagement[] | null) ?? []);
  };
  useEffect(() => {
    void load();
  }, []);

  const companyOf = (id: string) => clients.find((c) => c.id === id)?.company ?? "—";

  const create = async () => {
    if (!form.client_id || !form.project_name.trim()) return;
    await supabase.from("engagements").insert({
      client_id: form.client_id,
      project_name: form.project_name,
      size_m: form.size_m,
      scope: DEFAULT_SCOPE,
      fee_tier: feeTier(form.size_m),
      term: "24 months, terminable by either party on 60 days' written notice",
      status: "draft",
    });
    setCreating(false);
    setForm({ client_id: "", project_name: "", size_m: 120 });
    await load();
  };

  const advance = async (e: Engagement, status: Status) => {
    await supabase
      .from("engagements")
      .update({ status, signed_at: status === "signed" ? new Date().toISOString() : null })
      .eq("id", e.id);
    setLetter(null);
    await load();
  };

  return (
    <div className="min-h-screen">
      <CzHeader
        crumb={
          <>
            Pipeline › <b className="text-cz-ink-1">Engagements</b>
          </>
        }
        actions={
          <CzButton primary onClick={() => setCreating(true)}>
            ＋ New engagement
          </CzButton>
        }
      />
      <SHead
        title="Engagements"
        note="proposal and engagement letter from template — only a signed engagement can open an intake"
      />

      <div className="px-5 pt-3.5 pb-10">
        <div className="overflow-x-auto rounded-[10px] border border-cz-rule bg-cz-surface">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="cz-eyebrow text-left">
                <th className="border-b border-cz-grid px-3 py-2">Client</th>
                <th className="border-b border-cz-grid px-3 py-2">Project</th>
                <th className="border-b border-cz-grid px-3 py-2">Size</th>
                <th className="border-b border-cz-grid px-3 py-2">Fee tier</th>
                <th className="border-b border-cz-grid px-3 py-2">Status</th>
                <th className="border-b border-cz-grid px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="border-b border-cz-grid px-3 py-1.5 font-bold">
                    {companyOf(e.client_id)}
                  </td>
                  <td className="border-b border-cz-grid px-3 py-1.5">{e.project_name}</td>
                  <td className="cz-figure border-b border-cz-grid px-3 py-1.5">${e.size_m}M</td>
                  <td className="border-b border-cz-grid px-3 py-1.5 text-cz-ink-2">
                    {e.fee_tier}
                  </td>
                  <td className="border-b border-cz-grid px-3 py-1.5">
                    <span
                      className="inline-flex items-center gap-1.5 font-cz-mono text-[10.5px]"
                      style={{ color: STATUS_COLOR[e.status] }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: STATUS_COLOR[e.status] }}
                      />
                      {STATUS_LABEL[e.status]}
                    </span>
                  </td>
                  <td className="border-b border-cz-grid px-3 py-1.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <CzButton onClick={() => setLetter(e)}>Engagement letter →</CzButton>
                      {e.status === "signed" ? (
                        <Link to="/intake">
                          <CzButton primary>Open intake →</CzButton>
                        </Link>
                      ) : (
                        <CzButton disabled title="Intake opens only on a signed engagement">
                          Intake locked
                        </CzButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-cz-ink-3">
                    No engagements yet — create one from a client.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* create */}
      <Modal open={creating} onClose={() => setCreating(false)}>
        <h2 className="font-cz-sans text-[16px] font-bold">New engagement</h2>
        <div className="mt-3 grid gap-2.5">
          <label className="grid gap-1">
            <span className="cz-eyebrow">Client</span>
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 text-[13px] text-cz-ink-1 outline-none focus:border-cz-accent"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="cz-eyebrow">Project name</span>
            <input
              value={form.project_name}
              onChange={(e) => setForm({ ...form, project_name: e.target.value })}
              className="rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 text-[13px] text-cz-ink-1 outline-none focus:border-cz-accent"
            />
          </label>
          <label className="grid gap-1">
            <span className="cz-eyebrow">Project size ($M)</span>
            <input
              type="number"
              value={form.size_m}
              onChange={(e) => setForm({ ...form, size_m: Number(e.target.value) })}
              className="rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 text-[13px] text-cz-ink-1 outline-none focus:border-cz-accent"
            />
          </label>
          <div className="font-cz-mono text-[10.5px] text-cz-ink-3">
            Fee tier resolves to: {feeTier(form.size_m)}
          </div>
        </div>
        <div className="mt-3.5 flex justify-end gap-2">
          <CzButton onClick={() => setCreating(false)}>Cancel</CzButton>
          <CzButton primary onClick={() => void create()}>
            Create draft
          </CzButton>
        </div>
      </Modal>

      {/* letter */}
      <Modal open={letter !== null} onClose={() => setLetter(null)}>
        {letter ? (
          <>
            <h2 className="font-cz-sans text-[16px] font-bold">
              Engagement Letter — {letter.project_name}
            </h2>
            <div className="mt-0.5 mb-3.5 font-cz-mono text-[11px] text-cz-ink-3">
              {companyOf(letter.client_id)} · status {STATUS_LABEL[letter.status]}
            </div>
            <ReportShell>
              <ReportH>Scope of services</ReportH>
              <div>{letter.scope || DEFAULT_SCOPE}</div>
              <ReportH>Fee</ReportH>
              <div className="cz-figure">{letter.fee_tier}</div>
              <ReportH>Term</ReportH>
              <div>{letter.term}</div>
              <ReportH>Signature block</ReportH>
              <div className="mt-2 grid grid-cols-2 gap-6 text-[12.5px]">
                <div>
                  <div className="border-b border-cz-ink-3 pt-6" />
                  <div className="mt-1 font-cz-mono text-[10.5px] text-cz-ink-3">
                    For {companyOf(letter.client_id)} · date
                  </div>
                </div>
                <div>
                  <div className="border-b border-cz-ink-3 pt-6" />
                  <div className="mt-1 font-cz-mono text-[10.5px] text-cz-ink-3">
                    For ClaimZero · date
                  </div>
                </div>
              </div>
            </ReportShell>
            <Gate>
              ⏸ <b>Intake gate:</b> a New Project Intake can only be opened once this engagement is
              marked Signed.
            </Gate>
            <div className="mt-3.5 flex justify-end gap-2">
              <CzButton onClick={() => setLetter(null)}>Close</CzButton>
              <CzButton onClick={() => window.print()}>⎙ Print</CzButton>
              {letter.status === "draft" ? (
                <CzButton primary onClick={() => void advance(letter, "sent")}>
                  Mark sent →
                </CzButton>
              ) : null}
              {letter.status === "sent" ? (
                <CzButton primary onClick={() => void advance(letter, "signed")}>
                  Mark signed ✓
                </CzButton>
              ) : null}
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
