import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CzButton } from "@/components/cz/primitives";
import { ProjectHeaderStrip } from "./project.$id";
import {
  LIFECYCLE,
  registerFor,
  type DocStatus,
  type Lifecycle,
  type OwedBy,
} from "@/lib/claimzero/docs";

const api = getRouteApi("/_authenticated/project/$id");

type Search = { status?: DocStatus | "all" };

export const Route = createFileRoute("/_authenticated/project/$id/documents")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    status:
      search['status'] === "outstanding" ||
      search['status'] === "received" ||
      search['status'] === "not-yet-applicable"
        ? (search['status'] as DocStatus)
        : "all",
  }),
  component: Documents,
});

const STATUS_STYLE: Record<DocStatus, { label: string; color: string }> = {
  received: { label: "received", color: "var(--cz-good)" },
  outstanding: { label: "outstanding", color: "var(--cz-critical)" },
  "not-yet-applicable": { label: "not yet applicable", color: "var(--cz-ink-3)" },
};

const OWED: (OwedBy | "All")[] = ["All", "Owner", "Architect", "CM", "Counsel"];

function Pill({
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
      className="rounded-full border px-2.5 py-[3px] font-cz-mono text-[10.5px] tracking-[0.04em] transition-colors"
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

function Documents() {
  const { project: p } = api.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const reg = useMemo(() => registerFor(p), [p]);

  const [stage, setStage] = useState<Lifecycle | "All">("All");
  const [owed, setOwed] = useState<OwedBy | "All">("All");
  const [q, setQ] = useState("");
  const status = search.status ?? "all";
  const setStatus = (s: DocStatus | "all") =>
    void navigate({ search: { status: s }, replace: true });

  const filtered = reg.items.filter(
    (d) =>
      (stage === "All" || d.stage === stage) &&
      (owed === "All" || d.owedBy === owed) &&
      (status === "all" || d.status === status) &&
      (q === "" ||
        d.name.toLowerCase().includes(q.toLowerCase()) ||
        d.category.toLowerCase().includes(q.toLowerCase())),
  );

  const indexed = reg.items.filter((d) => d.status === "received");

  return (
    <>
      <ProjectHeaderStrip />
      <div className="px-5 pt-3.5 pb-10">
        <div className="mb-2 flex flex-wrap items-baseline gap-2.5">
          <h2 className="font-cz-sans text-[16px] font-bold">Document Register</h2>
          <span className="text-[12px] text-cz-ink-3">
            stage-aware expected documents · required for the <b>{p.stage}</b> stage · built so an
            owner can produce the record years later
          </span>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[10px] border border-cz-rule bg-cz-surface px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="cz-eyebrow mr-1">Stage</span>
            <Pill active={stage === "All"} onClick={() => setStage("All")}>
              All
            </Pill>
            {LIFECYCLE.map((s) => (
              <Pill key={s} active={stage === s} onClick={() => setStage(s)}>
                {s}
              </Pill>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="cz-eyebrow mr-1">Status</span>
            {(["all", "received", "outstanding", "not-yet-applicable"] as const).map((s) => (
              <Pill key={s} active={status === s} onClick={() => setStatus(s)}>
                {s === "all" ? "All" : STATUS_STYLE[s].label}
              </Pill>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="cz-eyebrow mr-1">Owed by</span>
            {OWED.map((o) => (
              <Pill key={o} active={owed === o} onClick={() => setOwed(o)}>
                {o}
              </Pill>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search documents…"
            className="ml-auto w-[220px] rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 font-cz-mono text-[11.5px] text-cz-ink-1 outline-none focus:border-cz-accent"
          />
        </div>

        <div className="overflow-x-auto rounded-[10px] border border-cz-rule bg-cz-surface">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="cz-eyebrow text-left">
                <th className="border-b border-cz-grid px-3 py-2">Document</th>
                <th className="border-b border-cz-grid px-3 py-2">Stage / category</th>
                <th className="border-b border-cz-grid px-3 py-2">Req.</th>
                <th className="border-b border-cz-grid px-3 py-2">Owes</th>
                <th className="border-b border-cz-grid px-3 py-2">Requested</th>
                <th className="border-b border-cz-grid px-3 py-2">Days out</th>
                <th className="border-b border-cz-grid px-3 py-2">Received</th>
                <th className="border-b border-cz-grid px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.key}>
                  <td className="border-b border-cz-grid px-3 py-1.5">{d.name}</td>
                  <td className="border-b border-cz-grid px-3 py-1.5 font-cz-mono text-[10.5px] text-cz-ink-3">
                    {d.stage} · {d.category}
                  </td>
                  <td className="border-b border-cz-grid px-3 py-1.5 font-cz-mono text-[10.5px] text-cz-ink-3">
                    {d.status === "not-yet-applicable" ? "—" : d.required ? "required" : "optional"}
                  </td>
                  <td className="border-b border-cz-grid px-3 py-1.5">{d.owedBy}</td>
                  <td className="border-b border-cz-grid px-3 py-1.5 cz-figure text-cz-ink-2">
                    {d.requestedOn ?? "—"}
                  </td>
                  <td
                    className="cz-figure border-b border-cz-grid px-3 py-1.5"
                    style={{ color: d.daysOutstanding > 14 ? "var(--cz-critical)" : undefined }}
                  >
                    {d.status === "outstanding" ? d.daysOutstanding : "—"}
                  </td>
                  <td className="border-b border-cz-grid px-3 py-1.5 cz-figure text-cz-ink-2">
                    {d.receivedOn ?? "—"}
                  </td>
                  <td className="border-b border-cz-grid px-3 py-1.5">
                    <span
                      className="inline-flex items-center gap-1.5 font-cz-mono text-[10.5px]"
                      style={{ color: STATUS_STYLE[d.status].color }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: STATUS_STYLE[d.status].color }}
                      />
                      {STATUS_STYLE[d.status].label}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-cz-ink-3">
                    No documents match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-5 mb-2 flex flex-wrap items-baseline gap-2.5">
          <h2 className="font-cz-sans text-[16px] font-bold">Document Index</h2>
          <span className="text-[12px] text-cz-ink-3">
            everything received, with its source system and indexing state
          </span>
          <CzButton className="ml-auto" onClick={() => window.print()}>
            ⎙ Print index
          </CzButton>
        </div>

        <div className="overflow-x-auto rounded-[10px] border border-cz-rule bg-cz-surface">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="cz-eyebrow text-left">
                <th className="border-b border-cz-grid px-3 py-2">Name</th>
                <th className="border-b border-cz-grid px-3 py-2">Category</th>
                <th className="border-b border-cz-grid px-3 py-2">Source</th>
                <th className="border-b border-cz-grid px-3 py-2">Date received</th>
                <th className="border-b border-cz-grid px-3 py-2">Indexed</th>
              </tr>
            </thead>
            <tbody>
              {indexed
                .filter((d) => q === "" || d.name.toLowerCase().includes(q.toLowerCase()))
                .map((d) => (
                  <tr key={`idx-${d.key}`}>
                    <td className="border-b border-cz-grid px-3 py-1.5">{d.name}</td>
                    <td className="border-b border-cz-grid px-3 py-1.5 text-cz-ink-2">
                      {d.category}
                    </td>
                    <td className="border-b border-cz-grid px-3 py-1.5 font-cz-mono text-[10.5px] text-cz-ink-3">
                      {d.source}
                    </td>
                    <td className="cz-figure border-b border-cz-grid px-3 py-1.5">{d.receivedOn}</td>
                    <td
                      className="border-b border-cz-grid px-3 py-1.5 font-cz-mono text-[10.5px]"
                      style={{ color: d.indexed ? "var(--cz-good)" : "var(--cz-warn)" }}
                    >
                      {d.indexed ? "indexed" : "queued"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
