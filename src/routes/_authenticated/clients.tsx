import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CzHeader } from "@/components/cz/header";
import { SHead } from "@/components/cz/shead";
import { CzButton, Modal } from "@/components/cz/primitives";
import { supabase } from "@/integrations/supabase/client";
import { CommercialOnly } from "@/components/cz/commercial-only";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({
    meta: [
      { title: "Clients — ClaimZero Pipeline" },
      {
        name: "description",
        content:
          "Owner and developer companies in the ClaimZero pipeline: contacts, status, and the engagements that must be signed before a project intake can open.",
      },
      { property: "og:title", content: "Clients — ClaimZero Pipeline" },
      {
        property: "og:description",
        content: "Companies, contacts and status ahead of engagement and project intake.",
      },
    ],
  }),
  component: GuardedClients,
});

export interface ClientRow {
  id: string;
  company: string;
  primary_contact: string;
  contact_email: string;
  phone: string;
  status: string;
}

const STATUSES = ["Prospect", "Active", "Dormant"];

function Clients() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    company: "",
    primary_contact: "",
    contact_email: "",
    phone: "",
    status: "Prospect",
  });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, company, primary_contact, contact_email, phone, status")
      .order("company");
    setRows((data as ClientRow[] | null) ?? []);
  };
  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    if (!form.company.trim()) return;
    setBusy(true);
    await supabase.from("clients").insert(form);
    setBusy(false);
    setOpen(false);
    setForm({
      company: "",
      primary_contact: "",
      contact_email: "",
      phone: "",
      status: "Prospect",
    });
    await load();
  };

  return (
    <div className="min-h-screen">
      <CzHeader
        crumb={
          <>
            Pipeline › <b className="text-cz-ink-1">Clients</b>
          </>
        }
        actions={
          <CzButton primary onClick={() => setOpen(true)}>
            ＋ New client
          </CzButton>
        }
      />
      <SHead title="Clients" note="companies and contacts ahead of engagement" />

      <div className="px-5 pt-3.5 pb-10">
        <div className="overflow-x-auto rounded-[10px] border border-cz-rule bg-cz-surface">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="cz-eyebrow text-left">
                <th className="border-b border-cz-grid px-3 py-2">Company</th>
                <th className="border-b border-cz-grid px-3 py-2">Primary contact</th>
                <th className="border-b border-cz-grid px-3 py-2">Email</th>
                <th className="border-b border-cz-grid px-3 py-2">Phone</th>
                <th className="border-b border-cz-grid px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="border-b border-cz-grid px-3 py-1.5 font-bold">{c.company}</td>
                  <td className="border-b border-cz-grid px-3 py-1.5 text-cz-ink-2">
                    {c.primary_contact || "—"}
                  </td>
                  <td className="border-b border-cz-grid px-3 py-1.5 font-cz-mono text-[10.5px] text-cz-ink-3">
                    {c.contact_email || "—"}
                  </td>
                  <td className="border-b border-cz-grid px-3 py-1.5 font-cz-mono text-[10.5px] text-cz-ink-3">
                    {c.phone || "—"}
                  </td>
                  <td
                    className="border-b border-cz-grid px-3 py-1.5 font-cz-mono text-[10.5px]"
                    style={{ color: "var(--cz-accent)" }}
                  >
                    {c.status}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-cz-ink-3">
                    No clients yet — add the first one.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}>
        <h2 className="font-cz-sans text-[16px] font-bold">New client</h2>
        <div className="mt-3 grid gap-2.5">
          {(
            [
              ["company", "Company"],
              ["primary_contact", "Primary contact"],
              ["contact_email", "Email"],
              ["phone", "Phone"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="grid gap-1">
              <span className="cz-eyebrow">{label}</span>
              <input
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                className="rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 text-[13px] text-cz-ink-1 outline-none focus:border-cz-accent"
              />
            </label>
          ))}
          <label className="grid gap-1">
            <span className="cz-eyebrow">Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 text-[13px] text-cz-ink-1 outline-none focus:border-cz-accent"
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3.5 flex justify-end gap-2">
          <CzButton onClick={() => setOpen(false)}>Cancel</CzButton>
          <CzButton primary disabled={busy} onClick={() => void create()}>
            Create client
          </CzButton>
        </div>
      </Modal>
    </div>
  );
}

function GuardedClients() {
  return (
    <CommercialOnly>
      <Clients />
    </CommercialOnly>
  );
}
