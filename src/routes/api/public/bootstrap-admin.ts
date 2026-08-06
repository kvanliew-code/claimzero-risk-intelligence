import { createFileRoute } from "@tanstack/react-router";

// TEMPORARY one-off admin provisioning endpoint. Deleted immediately after use.
export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          token: string;
          email: string;
          password: string;
          full_name?: string;
          title?: string;
        };
        if (body.token !== "cz-bootstrap-2026") {
          return new Response("Forbidden", { status: 403 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true,
          user_metadata: { full_name: body.full_name ?? "", title: body.title ?? "" },
        });
        if (error || !data.user) {
          return new Response(JSON.stringify({ error: error?.message }), { status: 400 });
        }
        const uid = data.user.id;
        await supabaseAdmin.from("profiles").upsert({
          id: uid,
          full_name: body.full_name ?? "",
          title: body.title ?? "",
          email: body.email,
        });
        await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: uid, role: "admin" });
        return new Response(JSON.stringify({ ok: !roleErr, uid, roleErr: roleErr?.message }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
