import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CzHeader, useTheme } from "@/components/cz/header";
import { SHead } from "@/components/cz/shead";
import { CzButton } from "@/components/cz/primitives";
import { ROLE_LABEL, useAuth, type AppRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useProjects } from "@/lib/claimzero/data";
import { ControlRegisterAdmin } from "@/components/cz/register-admin";
import {
  fetchReviewerDaysPerMonth,
  saveReviewerDaysPerMonth,
} from "@/lib/claimzero/pipeline";

function ReviewerCapacitySetting() {
  const [days, setDays] = useState(20);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    void fetchReviewerDaysPerMonth()
      .then(setDays)
      .catch(() => setState("error"));
  }, []);

  const save = async () => {
    setState("saving");
    try {
      await saveReviewerDaysPerMonth(days);
      setState("saved");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="mt-4 rounded-md border border-cz-rule bg-cz-surface px-3.5 py-3">
      <div className="text-[13px] font-semibold">Reviewer capacity</div>
      <div className="mb-2.5 font-cz-mono text-[11px] text-cz-ink-3">
        Reviewer-days available per month. Every forecast month is measured against this figure;
        months that exceed it are marked DELIVERY CAPACITY EXCEEDED on the Pipeline forecast.
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="reviewer-days" className="cz-eyebrow text-[9px] tracking-[0.18em]">
          Days / month
        </label>
        <input
          id="reviewer-days"
          type="number"
          min={0}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-24 rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 text-[13px] text-cz-ink-1 outline-none focus:border-cz-accent"
        />
        <CzButton primary onClick={() => void save()} disabled={state === "saving"}>
          Save
        </CzButton>
        <span className="font-cz-mono text-[10.5px] text-cz-ink-3">
          {state === "saved" ? "Saved" : state === "error" ? "Admins only" : ""}
        </span>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ClaimZero" },
      {
        name: "description",
        content:
          "Appearance, project assignments, seat mapping and integration credentials for the ClaimZero command center.",
      },
      { property: "og:title", content: "Settings — ClaimZero" },
      {
        property: "og:description",
        content: "Appearance, project assignments, seat mapping and integration credentials.",
      },
    ],
  }),
  component: Settings,
});

interface Person {
  id: string;
  full_name: string;
  email: string;
  role: AppRole | null;
}

function Assignments() {
  const projects = useProjects();
  const [people, setPeople] = useState<Person[]>([]);
  const [assigned, setAssigned] = useState<Record<string, number[]>>({});
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: profs }, { data: roles }, { data: asg }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("project_assignments").select("user_id, project_id"),
    ]);
    const list: Person[] = (profs ?? []).map((p) => ({
      id: p.id as string,
      full_name: (p.full_name as string) ?? "",
      email: (p.email as string) ?? "",
      role: ((roles ?? []).find((r) => r.user_id === p.id)?.role as AppRole) ?? null,
    }));
    setPeople(list);
    const map: Record<string, number[]> = {};
    for (const a of asg ?? []) {
      const uid = a.user_id as string;
      (map[uid] ??= []).push(a.project_id as number);
    }
    setAssigned(map);
    setSelected((cur) => cur || (list[0]?.id ?? ""));
  };

  useEffect(() => {
    void load();
  }, []);

  const mine = selected ? (assigned[selected] ?? []) : [];

  const toggleProject = async (projectId: number) => {
    if (!selected || busy) return;
    setBusy(true);
    if (mine.includes(projectId)) {
      await supabase
        .from("project_assignments")
        .delete()
        .eq("user_id", selected)
        .eq("project_id", projectId);
    } else {
      await supabase
        .from("project_assignments")
        .insert({ user_id: selected, project_id: projectId, role: "project_manager" });
    }
    await load();
    setBusy(false);
  };

  return (
    <div className="mt-4 rounded-md border border-cz-rule bg-cz-surface px-3.5 py-3">
      <div className="text-[13px] font-semibold">Project assignments</div>
      <div className="mb-2.5 font-cz-mono text-[11px] text-cz-ink-3">
        Assign project managers to the projects they may see. Admins and Executives see the whole
        book.
      </div>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="mb-3 w-full rounded-[5px] border border-cz-grid bg-cz-bg px-2.5 py-1.5 text-[13px] text-cz-ink-1 outline-none focus:border-cz-accent"
      >
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name || p.email} — {p.role ? ROLE_LABEL[p.role] : "no role"}
          </option>
        ))}
      </select>
      <div className="max-h-[320px] overflow-y-auto rounded-[6px] border border-cz-grid">
        {projects.map((p) => {
          const on = mine.includes(p.id);
          return (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-2.5 border-b border-cz-grid px-2.5 py-1.5 text-[12.5px] last:border-b-0 hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={on}
                disabled={busy}
                onChange={() => void toggleProject(p.id)}
              />
              <span className="font-bold">{p.name}</span>
              <span className="font-cz-mono text-[10.5px] text-cz-ink-3">
                {p.city} · ${p.sizeM}M · {p.stage}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function Settings() {
  const { theme, toggle } = useTheme();
  const { role } = useAuth();
  return (
    <div className="min-h-screen">
      <CzHeader
        crumb={
          <>
            <b className="text-cz-ink-1">Settings</b> · concept mockup
          </>
        }
      />
      <SHead title="Settings" note="appearance, roles and project assignments" />
      <div className="max-w-[900px] px-5 py-3 pb-10">
        <div className="flex items-center justify-between rounded-md border border-cz-rule bg-cz-surface px-3.5 py-3">
          <div>
            <div className="text-[13px] font-semibold">Appearance</div>
            <div className="font-cz-mono text-[11px] text-cz-ink-3">
              Currently {theme === "dark" ? "dark" : "light"} — dark is the house default
            </div>
          </div>
          <CzButton onClick={toggle}>◐ Toggle theme</CzButton>
        </div>

        {role === "admin" ? (
          <>
            <ReviewerCapacitySetting />
            <Assignments />
            <ControlRegisterAdmin />
          </>
        ) : (
          <p className="mt-4 font-cz-serif text-cz-ink-2">
            Project assignments are managed by an Admin.
          </p>
        )}

        <p className="mt-3 font-cz-serif text-cz-ink-2">
          Notification cadence, responsible-seat mapping and integration credentials are configured
          in the platform build.
        </p>
      </div>
    </div>
  );
}

