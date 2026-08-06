// Reviewer Queue — every surfaced risk and every exposure value waits here for
// human approval before it reaches a client. Backed by public.review_items.

import { supabase } from "@/integrations/supabase/client";
import type { StatusName } from "./data";

export type ReviewStatus = "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
export type ReviewKind = "risk" | "exposure" | "report" | "evidence";

export interface ReviewItem {
  id: string;
  project_id: number;
  project_name: string;
  kind: ReviewKind;
  control_id: string;
  aspect_id: string;
  aspect_name: string;
  headline: string;
  detail: string;
  exposure_usd: number;
  severity: StatusName;
  confidence: string;
  evidence_ref: string;
  source_excerpt: string;
  submitted_by: string;
  submitted_at: string;
  due_date: string | null;
  status: ReviewStatus;
  reviewer_note: string;
  reviewed_at: string | null;
}

export const KIND_LABEL: Record<ReviewKind, string> = {
  risk: "Surfaced risk",
  exposure: "Exposure value",
  report: "Report release",
  evidence: "Evidence verification",
};

export const STATUS_LABEL: Record<ReviewStatus, string> = {
  PENDING: "Awaiting review",
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes requested",
  REJECTED: "Rejected",
};

export async function fetchReviewItems(): Promise<ReviewItem[]> {
  const { data, error } = await supabase
    .from("review_items")
    .select("*")
    .order("submitted_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ReviewItem[];
}

export async function decideReviewItem(
  id: string,
  status: ReviewStatus,
  note: string,
  reviewerId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("review_items")
    .update({
      status,
      reviewer_note: note,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function pendingReviewCount(): Promise<{ total: number; risks: number; exposures: number }> {
  const { data, error } = await supabase
    .from("review_items")
    .select("kind")
    .eq("status", "PENDING");
  if (error) throw error;
  const rows = (data ?? []) as { kind: string }[];
  return {
    total: rows.length,
    risks: rows.filter((r) => r.kind === "risk" || r.kind === "evidence").length,
    exposures: rows.filter((r) => r.kind === "exposure" || r.kind === "report").length,
  };
}

export const ageInDays = (iso: string) =>
  Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));

export const usd = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n).toLocaleString()}`;
