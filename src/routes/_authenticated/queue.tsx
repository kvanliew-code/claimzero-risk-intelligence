import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CzHeader } from "@/components/cz/header";
import { SHead } from "@/components/cz/shead";
import { CzButton, StatusPill } from "@/components/cz/primitives";
import { useAuth } from "@/hooks/useAuth";
import {
  KIND_LABEL,
  STATUS_LABEL,
  ageInDays,
  decideReviewItem,
  fetchReviewItems,
  usd,
  type ReviewItem,
  type ReviewStatus,
} from "@/lib/claimzero/review";

export const Route = createFileRoute("/_authenticated/queue")({
  head: () => ({
    meta: [
      { title: "Reviewer Queue — ClaimZero" },
      {
        name: "description",
        content:
          "Every surfaced risk and every exposure value waits here for human approval before it reaches a client.",
      },
      { property: "og:title", content: "Reviewer Queue — ClaimZero" },
      {
        property: "og:description",
        content: "Nothing reaches a client unreviewed — the queue is the product's warranty.",
      },
    ],
  }),
  component: Queue,
});

const TABS: { key: ReviewStatus | "ALL"; label: string }[] = [
  { key: "PENDING", label: "Awaiting review" },
  { key: "CHANGES_REQUESTED", label: "Changes requested" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ALL", label: "Everything" },
];

function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <div
      className="rounded-[10px] border border-cz-rule bg-cz-surface px-3.5 py-2.5"
      style={{ borderTop: "2px solid var(--cz-accent-solid)" }}
    >
      <div className="cz-eyebrow" style={{ color: "var(--cz-accent)" }}>
        {label}
      </div>
      <div className="cz-figure mt-0.5 text-[24px] font-bold">{value}</div>
      <div className="mt-0.5 text-[12px] text-cz-ink-2">{sub}</div>
    </div>
  );
}

function Card({
  item,
  canDecide,
  onDecide,
  busy,
}: {
  item: ReviewItem;
  canDecide: boolean;
  onDecide: (status: ReviewStatus, note: string) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const age = ageInDays(item.submitted_at);
  const border =
    item.severity === "Critical"
      ? "var(--cz-critical)"
      : item.severity === "Serious"
        ? "var(--cz-serious)"
        : item.severity === "Watch"
          ? "var(--cz-warn)"
          : "var(--cz-good)";

  return (
    <div
      className="mb-2 rounded-[10px] border border-cz-rule bg-cz-surface px-3.5 py-3"
      style={{ borderLeft: `3px solid ${border}` }}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="cz-eyebrow" style={{ color: "var(--cz-accent)" }}>
          {KIND_LABEL[item.kind]}
        </span>
        <Link
          to="/project/$id"
          params={{ id: String(item.project_id) }}
          className="font-cz-sans text-[13.5px] font-bold hover:underline"
        >
          {item.project_name}
        </Link>
        <span className="font-cz-mono text-[10.5px] text-cz-ink-3">
          {item.control_id} · {item.aspect_id} {item.aspect_name}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <StatusPill status={item.severity} />
          <span
            className="font-cz-mono text-[10.5px]"
            style={{ color: age >= 5 ? "var(--cz-critical)" : "var(--cz-ink-3)" }}
          >
            {age}d in queue
          </span>
        </span>
      </div>

      <p className="mt-1.5 max-w-[80ch] font-cz-sans text-[14.5px] leading-snug font-bold">
        {item.headline}
      </p>
      <p className="mt-1 max-w-[86ch] text-[12.5px] text-cz-ink-2">{item.detail}</p>

      <div className="mt-1.5 flex flex-wrap gap-x-4 font-cz-mono text-[10.5px] text-cz-ink-3">
        <span>source · {item.evidence_ref}</span>
        <span>confidence · {item.confidence.toLowerCase()}</span>
        {item.exposure_usd > 0 && <span>exposure · {usd(item.exposure_usd)}</span>}
        <span>submitted by {item.submitted_by}</span>
        {item.due_date && <span>due {item.due_date}</span>}
      </div>

      {item.status !== "PENDING" && (
        <div className="mt-2 rounded-md border border-cz-grid px-2.5 py-1.5 text-[12px] text-cz-ink-2">
          <b className="font-cz-mono text-[10px] tracking-[0.08em] uppercase">
            {STATUS_LABEL[item.status]}
          </b>
          {item.reviewer_note && <span> — {item.reviewer_note}</span>}
        </div>
      )}

      {canDecide && item.status === "PENDING" && (
        <div className="mt-2.5">
          {open ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reviewer note — what must change before release"
                className="min-w-[260px] flex-1 rounded-md border border-cz-grid bg-transparent px-2.5 py-1.5 text-[12.5px] outline-none focus:border-cz-accent"
              />
              <CzButton
                disabled={busy}
                onClick={() => onDecide("CHANGES_REQUESTED", note || "Changes requested.")}
              >
                Send back
              </CzButton>
              <CzButton disabled={busy} onClick={() => onDecide("REJECTED", note || "Rejected.")}>
                Reject
              </CzButton>
              <CzButton onClick={() => setOpen(false)}>Cancel</CzButton>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <CzButton
                primary
                disabled={busy}
                onClick={() => onDecide("APPROVED", "Verified against the cited source.")}
              >
                ✓ Approve for release
              </CzButton>
              <CzButton onClick={() => setOpen(true)}>Request changes / reject</CzButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Queue() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReviewStatus | "ALL">("PENDING");
  const [busy, setBusy] = useState<string | null>(null);

  const canDecide = role === "admin" || role === "reviewer";

  const load = async () => {
    try {
      setItems(await fetchReviewItems());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load the queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const pending = items.filter((i) => i.status === "PENDING");
  const shown = useMemo(
    () => (tab === "ALL" ? items : items.filter((i) => i.status === tab)),
    [items, tab],
  );

  const pendingExposure = pending.reduce((s, i) => s + Number(i.exposure_usd), 0);
  const oldest = pending.length ? Math.max(...pending.map((i) => ageInDays(i.submitted_at))) : 0;
  const criticals = pending.filter((i) => i.severity === "Critical").length;

  const decide = async (item: ReviewItem, status: ReviewStatus, note: string) => {
    setBusy(item.id);
    try {
      await decideReviewItem(item.id, status, note, user?.id ?? null);
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status, reviewer_note: note, reviewed_at: new Date().toISOString() }
            : i,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "That decision did not save");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen">
      <CzHeader
        crumb={
          <>
            <b className="text-cz-ink-1">Reviewer Queue</b> · {pending.length} awaiting human
            approval
          </>
        }
      />
      <SHead
        title="Reviewer Queue"
        note="nothing reaches a client unreviewed — the queue is the product's warranty"
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2.5 px-5 py-3.5">
        <Kpi
          label="Awaiting review"
          value={pending.length}
          sub={`${pending.filter((i) => i.kind === "risk").length} risks · ${pending.filter((i) => i.kind === "exposure").length} exposure values`}
        />
        <Kpi
          label="Critical in queue"
          value={<span style={{ color: "var(--cz-critical)" }}>▲ {criticals}</span>}
          sub="release-blocking severity"
        />
        <Kpi label="Exposure pending" value={usd(pendingExposure)} sub="unreleased until approved" />
        <Kpi
          label="Oldest item"
          value={`${oldest}d`}
          sub={oldest >= 5 ? "past the 5-day service line" : "inside the service line"}
        />
        <Kpi
          label="Decided"
          value={items.filter((i) => i.status !== "PENDING").length}
          sub={`${items.filter((i) => i.status === "APPROVED").length} approved · ${items.filter((i) => i.status === "CHANGES_REQUESTED").length} sent back`}
        />
      </div>

      <div className="flex flex-wrap gap-2 px-5">
        {TABS.map((t) => {
          const n = t.key === "ALL" ? items.length : items.filter((i) => i.status === t.key).length;
          return (
            <CzButton key={t.key} primary={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label} ({n})
            </CzButton>
          );
        })}
      </div>

      {!canDecide && (
        <p className="px-5 pt-3 text-[12.5px] text-cz-ink-3">
          You have read access to the queue. Approvals are recorded by Reviewers and Admins.
        </p>
      )}
      {error && (
        <p className="px-5 pt-3 text-[12.5px]" style={{ color: "var(--cz-critical)" }}>
          {error}
        </p>
      )}

      <div className="px-5 py-3.5 pb-12">
        {loading && <p className="text-[13px] text-cz-ink-3">Loading the queue…</p>}
        {!loading && shown.length === 0 && (
          <p className="text-[13px] text-cz-ink-3">Nothing in this bucket.</p>
        )}
        {shown.map((i) => (
          <Card
            key={i.id}
            item={i}
            canDecide={canDecide}
            busy={busy === i.id}
            onDecide={(status, note) => void decide(i, status, note)}
          />
        ))}
      </div>
    </div>
  );
}
