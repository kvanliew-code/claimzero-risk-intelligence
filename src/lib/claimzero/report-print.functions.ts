// Server-side render of a published report. Export and share are only ever
// served from status PUBLISHED, and the HTML is built from the stored payload
// plus its immutable snapshot hash — never from whatever the browser holds.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reportToHtml } from "./report-html";
import type { GeneratedReport } from "./reports";

export const renderPublishedReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reportId: string }) => {
    if (!input || typeof input.reportId !== "string" || !input.reportId)
      throw new Error("reportId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("reports")
      .select("id, status, payload, published_at, snapshot_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("Report not found");
    if (row.status !== "PUBLISHED")
      throw new Error("Only a PUBLISHED report can be exported or shared");

    let contentHash: string | null = null;
    if (row.snapshot_id) {
      const { data: snap } = await context.supabase
        .from("report_snapshots")
        .select("content_hash")
        .eq("id", row.snapshot_id)
        .maybeSingle();
      contentHash = (snap as { content_hash: string } | null)?.content_hash ?? null;
    }

    return {
      html: reportToHtml(row.payload as unknown as GeneratedReport, {
        contentHash,
        publishedAt: row.published_at,
      }),
    };
  });
