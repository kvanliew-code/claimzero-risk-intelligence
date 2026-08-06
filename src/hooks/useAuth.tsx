import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "executive" | "project_manager" | "reviewer";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  executive: "Executive",
  project_manager: "Project Manager",
  reviewer: "Reviewer",
};

interface Profile {
  id: string;
  full_name: string;
  title: string;
  email: string;
}

interface AuthValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  assignedProjectIds: number[];
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue>({
  session: null,
  user: null,
  profile: null,
  role: null,
  assignedProjectIds: [],
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [assignedProjectIds, setAssigned] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setRole(null);
      setAssigned([]);
      return;
    }
    const [{ data: prof }, { data: roles }, { data: asg }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, title, email").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("project_assignments").select("project_id").eq("user_id", uid),
    ]);
    setProfile((prof as Profile | null) ?? null);
    const order: AppRole[] = ["admin", "executive", "reviewer", "project_manager"];
    const mine = (roles ?? []).map((r) => r.role as AppRole);
    setRole(order.find((r) => mine.includes(r)) ?? null);
    setAssigned((asg ?? []).map((a) => a.project_id as number));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      void load(s?.user?.id);
    });
    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await load(data.session?.user?.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role,
      assignedProjectIds,
      loading,
      refresh: () => load(session?.user?.id),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, role, assignedProjectIds, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
