import { useEffect, useMemo, useState } from "react";
import { CzButton } from "@/components/cz/primitives";
import { supabase } from "@/integrations/supabase/client";
import {
  DOMAINS,
  REGISTER_CSV_COLUMNS,
  controlsToCsv,
  csvToControls,
  registerCsvIssues,

  fetchEscalationRules,
  fetchRegister,
  fetchStages,
  type ControlSpec,
  type EscalationRule,
  type StageConfig,
} from "@/lib/claimzero/controls";

function Card({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-md border border-cz-rule bg-cz-surface px-3.5 py-3">
      <div className="text-[13px] font-semibold">{title}</div>
      <div className="mb-2.5 font-cz-mono text-[11px] text-cz-ink-3">{note}</div>
      {children}
    </div>
  );
}

const input =
  "w-full rounded-[5px] border border-cz-grid bg-cz-bg px-2 py-1 text-[12px] text-cz-ink-1 outline-none focus:border-cz-accent";

export function ControlRegisterAdmin() {
  const [rows, setRows] = useState<ControlSpec[]>([]);
  const [stages, setStages] = useState<StageConfig[]>([]);
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [q, setQ] = useState("");
  const [csv, setCsv] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [reg, stg, esc] = await Promise.all([fetchRegister(), fetchStages(), fetchEscalationRules()]);
    setRows(reg);
    setStages(stg);
    setRules(esc);
  };
  useEffect(() => {
    void load();
  }, []);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.control_id, r.family_name, r.requirement, r.domain, r.stage_name]
        .join(" ")
        .toLowerCase()
        .includes(t),
    );
  }, [rows, q]);

  const patch = async (id: string, p: Partial<ControlSpec>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));
    await supabase.from("control_register").update(p as never).eq("id", id);
  };

  const importCsv = async () => {
    const issues = registerCsvIssues(csv);
    if (issues.length > 0) {
      setMsg(`Import refused — ${issues.join(" · ")}`);
      return;
    }
    const parsed = csvToControls(csv).filter((r) => r.control_id);
    if (parsed.length === 0) {
      setMsg("No rows found — the header must include control_id.");
      return;
    }

    setBusy(true);
    const { error } = await supabase
      .from("control_register")
      .upsert(parsed as never[], { onConflict: "control_id" });
    setBusy(false);
    if (error) setMsg(error.message);
    else {
      setMsg(`Imported ${parsed.length} controls.`);
      setCsv("");
      await load();
    }
  };

  const download = (name: string, text: string) => {
    const blob = new Blob([text], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => download("claimzero-control-register.csv", controlsToCsv(rows));

  const downloadTemplate = () =>
    download("claimzero-control-register-template.csv", REGISTER_CSV_COLUMNS.join(",") + "\n");


  const saveStage = async (s: StageConfig, weights: string, criteria: string) => {
    let domain_weights: Record<string, number>;
    try {
      domain_weights = JSON.parse(weights);
    } catch {
      setMsg(`Stage ${s.stage_number}: weights must be valid JSON.`);
      return;
    }
    const exit_criteria = criteria
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    await supabase
      .from("lifecycle_stages")
      .update({ domain_weights, exit_criteria } as never)
      .eq("stage_number", s.stage_number);
    setMsg(`Stage ${s.stage_number} configuration saved.`);
    await load();
  };

  return (
    <>
      <Card
        title="Control register"
        note={`${rows.length} controls · edit inline, or bulk-import a stage specification as CSV`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search controls…"
            className={input + " max-w-[240px]"}
          />
          <CzButton onClick={exportCsv}>↓ Export CSV</CzButton>
          <CzButton onClick={downloadTemplate}>
            ↓ CSV template ({REGISTER_CSV_COLUMNS.length} columns)
          </CzButton>


        </div>
        <div className="max-h-[420px] overflow-auto rounded-[6px] border border-cz-grid">
          <table className="w-full border-collapse text-[11.5px]">
            <thead className="sticky top-0 bg-cz-header">
              <tr className="text-left font-cz-mono text-[10px] tracking-[0.06em] text-cz-ink-3 uppercase">
                <th className="px-2 py-1.5">Control</th>
                <th className="px-2 py-1.5">Stage</th>
                <th className="px-2 py-1.5">Family</th>
                <th className="px-2 py-1.5">Requirement</th>
                <th className="px-2 py-1.5">Owner</th>
                <th className="px-2 py-1.5">Tier</th>
                <th className="px-2 py-1.5">Domain</th>
                <th className="px-2 py-1.5">Cont.</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-cz-grid align-top">
                  <td className="px-2 py-1 font-cz-mono text-[10.5px]">{r.control_id}</td>
                  <td className="px-2 py-1 font-cz-mono text-[10.5px]">{r.stage_number}</td>
                  <td className="px-2 py-1">
                    <input
                      className={input}
                      defaultValue={r.family_name}
                      onBlur={(e) => void patch(r.id, { family_name: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className={input}
                      defaultValue={r.requirement}
                      onBlur={(e) => void patch(r.id, { requirement: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className={input}
                      defaultValue={r.primary_owner_role}
                      onBlur={(e) => void patch(r.id, { primary_owner_role: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <select
                      className={input}
                      value={r.min_tier}
                      onChange={(e) =>
                        void patch(r.id, { min_tier: e.target.value as ControlSpec["min_tier"] })
                      }
                    >
                      {["A", "B", "C"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <select
                      className={input}
                      value={r.domain}
                      onChange={(e) =>
                        void patch(r.id, { domain: e.target.value as ControlSpec["domain"] })
                      }
                    >
                      {DOMAINS.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      className="accent-[var(--cz-accent)]"
                      checked={r.continuous}
                      title="Continuous — evaluated in every stage gate from this stage forward"
                      onChange={(e) => void patch(r.id, { continuous: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Bulk import"
        note={`CSV header: ${REGISTER_CSV_COLUMNS.join(", ")} — existing control_id values are updated in place`}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setCsv(await f.text());
          }}
          className="mb-2 block font-cz-mono text-[11px] text-cz-ink-2"
        />
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="…or paste CSV here"
          className="h-28 w-full rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 font-cz-mono text-[11.5px] outline-none focus:border-cz-accent"
        />
        <div className="mt-2 flex items-center gap-2">
          <CzButton onClick={() => void importCsv()} disabled={busy || !csv.trim()}>
            ↑ Import register
          </CzButton>
          {msg && <span className="font-cz-mono text-[11px] text-cz-ink-3">{msg}</span>}
        </div>
      </Card>

      <Card
        title="Stage configuration"
        note="Domain weights drive the Composite Risk Index per stage; exit criteria drive the stage gate"
      >
        <div className="space-y-3">
          {stages.map((s) => (
            <StageEditor key={s.stage_number} stage={s} onSave={saveStage} />
          ))}
        </div>
      </Card>

      <Card title="Escalation rules" note="Conditions that push an item to the Weekly Top Ten regardless of score">
        <div className="space-y-2">
          {rules.map((r) => (
            <label
              key={r.id}
              className="flex items-start gap-2.5 rounded-[6px] border border-cz-grid px-2.5 py-2 text-[12.5px]"
            >
              <input
                type="checkbox"
                checked={r.active}
                onChange={async (e) => {
                  setRules((prev) =>
                    prev.map((x) => (x.id === r.id ? { ...x, active: e.target.checked } : x)),
                  );
                  await supabase
                    .from("escalation_rules")
                    .update({ active: e.target.checked })
                    .eq("id", r.id);
                }}
                className="mt-1"
              />
              <span>
                <b>{r.name}</b>{" "}
                <span className="font-cz-mono text-[10px] text-cz-ink-3">
                  {r.scope} · {r.severity}
                </span>
                <div className="text-cz-ink-2">{r.description}</div>
                <div className="font-cz-mono text-[10px] text-cz-ink-3">
                  {JSON.stringify(r.condition)}
                </div>
              </span>
            </label>
          ))}
        </div>
      </Card>
    </>
  );
}

function StageEditor({
  stage,
  onSave,
}: {
  stage: StageConfig;
  onSave: (s: StageConfig, weights: string, criteria: string) => void | Promise<void>;
}) {
  const [weights, setWeights] = useState(JSON.stringify(stage.domain_weights));
  const [criteria, setCriteria] = useState(stage.exit_criteria.join("\n"));
  return (
    <div className="rounded-[6px] border border-cz-grid px-2.5 py-2">
      <div className="text-[12.5px] font-bold">
        {stage.stage_number}. {stage.stage_name}
      </div>
      <input
        value={weights}
        onChange={(e) => setWeights(e.target.value)}
        className={input + " mt-1.5 font-cz-mono"}
      />
      <textarea
        value={criteria}
        onChange={(e) => setCriteria(e.target.value)}
        className="mt-1.5 h-20 w-full rounded-[5px] border border-cz-grid bg-cz-bg px-2 py-1 text-[12px] outline-none focus:border-cz-accent"
      />
      <div className="mt-1.5">
        <CzButton onClick={() => void onSave(stage, weights, criteria)}>Save stage</CzButton>
      </div>
    </div>
  );
}
