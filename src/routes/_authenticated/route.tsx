import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Local session first: it is synchronous-ish and does not depend on the
    // network. A transient fetch failure against the auth server must never
    // eject a signed-in user back to /auth.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw redirect({ to: "/auth" });

    const { data, error } = await supabase.auth.getUser();
    if (data?.user) return { user: data.user };

    // Only treat it as signed-out when the auth server explicitly rejects the
    // token; network/5xx failures fall back to the local session.
    const status = (error as { status?: number } | null)?.status;
    if (status === 401 || status === 403) {
      await supabase.auth.signOut({ scope: "local" });
      throw redirect({ to: "/auth" });
    }
    return { user: sessionData.session.user };
  },
  component: () => <Outlet />,
});
