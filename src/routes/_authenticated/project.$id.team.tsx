import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gate } from "@/components/cz/primitives";
import { ProjectHeaderStrip } from "./project.$id";
import { ROLE_LABEL, useAuth, type AppRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const api = getRouteApi("/_authenticated/project/$id");

export const Route = createFileRoute("/_authenticated/project/$id/team")({
  component: Team,
});

interface Member {
  user_id: string;
  full_name: string;
  title: string;
  email: string;
  role: AppRole | null;
}

function Team() {
  const { project: p } = api.useLoaderData();
  const { role } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data: asg } = await supabase
        .from("project_assignments")
        .select("user_id")
        .eq("project_id", p.id);
      const ids = (asg ?? []).map((a) => a.user_id as string);
      if (ids.length === 0) {
        if (alive) {
          setMembers([]);
          setLoading(false);
        }
        return;
      }
      const [{ data: profs }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, title, email").in("id", ids),
        supabase.from("user_roles").select("user_id, role").in("user_id", ids),
      ]);
      if (!alive) return;
      setMembers(
        (profs ?? []).map((pr) => ({
          user_id: pr.id as string,
          full_name: (pr.full_name as string) ?? "",
          title: (pr.title as string) ?? "",
          email: (pr.email as string) ?? "",
          role: ((roles ?? []).find((r) => r.user_id === pr.id)?.role as AppRole) ?? null,
        })),
      );
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [p.id]);

  return (
    <>
      <ProjectHeaderStrip />
      <div className="px-5 pt-3.5 pb-10">
        <div className="mb-2 flex flex-wrap items-baseline gap-2.5">
          <h2 className="font-cz-sans text-[16px] font-bold">Team &amp; Access</h2>
          <span className="text-[12px] text-cz-ink-3">
            who can see {p.name} · assignments are managed by an Admin in Settings
          </span>
        </div>

        <div className="overflow-x-auto rounded-[10px] border border-cz-rule bg-cz-surface">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="cz-eyebrow text-left">
                <th className="border-b border-cz-grid px-3 py-2">Name</th>
                <th className="border-b border-cz-grid px-3 py-2">Title</th>
                <th className="border-b border-cz-grid px-3 py-2">Email</th>
                <th className="border-b border-cz-grid px-3 py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-cz-ink-3">
                    Loading assignments…
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-cz-ink-3">
                    No project managers assigned yet. Admins assign PMs in Settings → Project
                    assignments.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.user_id}>
                    <td className="border-b border-cz-grid px-3 py-1.5">{m.full_name || "—"}</td>
                    <td className="border-b border-cz-grid px-3 py-1.5 text-cz-ink-2">
                      {m.title || "—"}
                    </td>
                    <td className="border-b border-cz-grid px-3 py-1.5 font-cz-mono text-[10.5px] text-cz-ink-3">
                      {m.email}
                    </td>
                    <td
                      className="border-b border-cz-grid px-3 py-1.5 font-cz-mono text-[10.5px]"
                      style={{ color: "var(--cz-accent)" }}
                    >
                      {m.role ? ROLE_LABEL[m.role] : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Gate>
          ◉ <b>Access rule:</b> Project Managers see only the projects assigned to them; Executives
          see a rollup of theirs; Admins see the whole portfolio.
          {role === "admin" ? " You are an Admin — you can change assignments in Settings." : ""}
        </Gate>
      </div>
    </>
  );
}
