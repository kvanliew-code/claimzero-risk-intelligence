import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CzHeader } from "@/components/cz/header";
import { SHead } from "@/components/cz/shead";
import { CzButton } from "@/components/cz/primitives";
import {
  EMPTY_DRAFT,
  FIELD_GROUPS,
  PROFILE_FIELDS,
  createProjectFromDraft,
  previewApplicability,
  tierFromValueBand,
  type ProfileDraft,
  PROFILE_FIELD_COUNT,
  type ProfileField,
} from "@/lib/claimzero/profile";

export const Route = createFileRoute("/_authenticated/intake")({
  head: () => ({
    meta: [
      { title: "New Project / Intake — ClaimZero" },
      {
        name: "description",
        content: `The ${PROFILE_FIELD_COUNT}-field project profile. Every answer drives the applicability engine: which control families switch on, and which are suppressed with a stated reason.`,
      },
      { property: "og:title", content: "New Project / Intake — ClaimZero" },
      {
        property: "og:description",
        content: "Answer the profile once; the register scopes itself to the project.",
      },
    ],
  }),
  component: Intake,
});

function Label({ f }: { f: ProfileField }) {
  return (
    <div className="mb-1">
      <div className="text-[11px] uppercase tracking-[0.08em] text-cz-ink-2">{f.label}</div>
      {f.help ? <div className="mt-0.5 text-[11px] text-cz-ink-3">{f.help}</div> : null}
    </div>
  );
}

const inputCls =
  "w-full rounded border border-cz-rule bg-cz-page px-2.5 py-1.5 text-[13px] text-cz-ink-1 outline-none focus:border-cz-accent";

function Field({
  f,
  value,
  onChange,
}: {
  f: ProfileField;
  value: ProfileDraft[string];
  onChange: (v: ProfileDraft[string]) => void;
}) {
  if (f.kind === "boolean") {
    return (
      <label className="flex cursor-pointer items-start gap-2.5 rounded border border-cz-rule bg-cz-page px-2.5 py-2">
        <input
          type="checkbox"
          className="mt-0.5 accent-cz-accent"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          <span className="block text-[13px] text-cz-ink-1">{f.label}</span>
          {f.help ? <span className="block text-[11px] text-cz-ink-3">{f.help}</span> : null}
        </span>
      </label>
    );
  }
  if (f.kind === "multiselect") {
    const arr = (value as string[]) ?? [];
    return (
      <div>
        <Label f={f} />
        <div className="flex flex-wrap gap-1.5">
          {f.options?.map((o) => {
            const on = arr.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(on ? arr.filter((x) => x !== o.value) : [...arr, o.value])}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  on
                    ? "border-cz-accent bg-cz-accent/15 text-cz-ink-1"
                    : "border-cz-rule text-cz-ink-2 hover:text-cz-ink-1"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div>
      <Label f={f} />
      {f.kind === "select" ? (
        <select
          className={inputCls}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={inputCls}
          type={f.kind === "number" ? "number" : "text"}
          value={String(value ?? "")}
          onChange={(e) =>
            onChange(f.kind === "number" ? Number(e.target.value || 0) : e.target.value)
          }
        />
      )}
    </div>
  );
}

function Intake() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProfileDraft>({ ...EMPTY_DRAFT });
  const [preview, setPreview] = useState<{
    applies: number;
    total: number;
    suppressed: { family_code: string; reason: string | null }[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string, v: ProfileDraft[string]) =>
    setDraft((d) => {
      const next = { ...d, [k]: v };
      if (k === "contract_value_band") next["project_tier"] = tierFromValueBand(String(v));
      return next;
    });

  // Live applicability preview — debounced so every keystroke doesn't hit the evaluator.
  useEffect(() => {
    const t = setTimeout(() => {
      previewApplicability(draft)
        .then(setPreview)
        .catch(() => setPreview(null));
    }, 350);
    return () => clearTimeout(t);
  }, [draft]);

  const ready = useMemo(
    () => String(draft["name"]).trim().length > 1 && (draft["asset_class"] as string[]).length > 0,
    [draft],
  );

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const id = await createProjectFromDraft(draft);
      navigate({ to: "/project/$id", params: { id: String(id) } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create the project.");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <CzHeader
        crumb={
          <>
            <b className="text-cz-ink-1">New Project / Intake</b> · project profile
          </>
        }
      />
      <SHead
        title="New Project / Intake"
        note="answer the profile once — the applicability engine scopes the control register to this project and states a reason for every family it suppresses"
      />

      <div className="grid grid-cols-1 gap-4 px-5 py-3.5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {FIELD_GROUPS.map((g) => (
            <section key={g} className="rounded-lg border border-cz-rule bg-cz-surface p-4">
              <h2 className="mb-3 font-cz-serif text-[15px] text-cz-ink-1">{g}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PROFILE_FIELDS.filter((f) => f.group === g).map((f) => (
                  <div
                    key={f.key}
                    className={f.kind === "multiselect" ? "sm:col-span-2" : undefined}
                  >
                    <Field f={f} value={draft[f.key] ?? ""} onChange={(v) => set(f.key, v)} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-lg border border-cz-rule bg-cz-surface p-4">
            <div className="text-[11px] uppercase tracking-[0.08em] text-cz-ink-2">
              Applicability preview
            </div>
            <div className="mt-2 font-cz-serif text-[30px] leading-none text-cz-ink-1">
              {preview ? preview.applies : "—"}
              <span className="text-[15px] text-cz-ink-3">
                {preview ? ` / ${preview.total}` : ""}
              </span>
            </div>
            <div className="mt-1 text-[12px] text-cz-ink-2">control families switched on</div>
            <div className="mt-3 border-t border-cz-rule pt-2">
              <div className="text-[11px] uppercase tracking-[0.08em] text-cz-ink-2">
                Suppressed
              </div>
              <ul className="mt-1.5 max-h-[280px] space-y-1.5 overflow-auto pr-1">
                {(preview?.suppressed ?? []).map((s) => (
                  <li key={s.family_code} className="text-[11px] leading-snug text-cz-ink-3">
                    <span className="text-cz-ink-2">{s.family_code}</span>
                    {s.reason ? ` — ${s.reason}` : ""}
                  </li>
                ))}
                {preview && preview.suppressed.length === 0 ? (
                  <li className="text-[11px] text-cz-ink-3">Nothing suppressed.</li>
                ) : null}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-cz-rule bg-cz-surface p-4">
            <div className="text-[12px] text-cz-ink-2">
              Tier <b className="text-cz-ink-1">{String(draft["project_tier"])}</b>, seeded from the
              contract value band.
            </div>
            {err ? <div className="mt-2 text-[12px] text-cz-critical">{err}</div> : null}
            <div className="mt-3">
              <CzButton primary onClick={submit} disabled={!ready || busy}>
                {busy ? "Creating…" : "Create project →"}
              </CzButton>
            </div>
            {!ready ? (
              <div className="mt-2 text-[11px] text-cz-ink-3">
                A name and at least one asset class are required.
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
