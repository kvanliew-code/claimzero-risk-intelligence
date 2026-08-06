// Evidence capture — binds a document, its page and the operative clause to a
// single control instance. Files live in the private `evidence` bucket under
// <project_id>/<control_id>/<uuid>-<filename>.

import { supabase } from "@/integrations/supabase/client";

export const SOURCE_CLASSES = [
  "CONTEMPORANEOUS_PROJECT_RECORD",
  "CONTRACT_DOCUMENT",
  "THIRD_PARTY_RECORD",
  "DERIVED_ANALYSIS",
] as const;
export type SourceClass = (typeof SOURCE_CLASSES)[number];

export const CONFIDENCES = ["FULL", "LIMITED", "INSUFFICIENT"] as const;
export type EvidenceConfidence = (typeof CONFIDENCES)[number];

export const CONFIDENCE_COLOR: Record<EvidenceConfidence, string> = {
  FULL: "var(--cz-good)",
  LIMITED: "var(--cz-warn)",
  INSUFFICIENT: "var(--cz-critical)",
};

export interface ControlEvidence {
  id: string;
  project_id: number;
  control_id: string;
  document_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  page_ref: string;
  clause_ref: string;
  excerpt: string;
  source_class: SourceClass;
  confidence: EvidenceConfidence;
  document_date: string | null;
  captured_by: string | null;
  captured_by_name: string;
  created_at: string;
}

const BUCKET = "evidence";

export async function fetchEvidence(projectId: number): Promise<ControlEvidence[]> {
  const { data, error } = await supabase
    .from("control_evidence")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ControlEvidence[];
}

const slug = (s: string) => s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);

export async function uploadEvidenceFile(
  projectId: number,
  controlId: string,
  file: File,
): Promise<{ path: string; size: number; type: string }> {
  const path = `${projectId}/${slug(controlId)}/${crypto.randomUUID()}-${slug(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return { path, size: file.size, type: file.type || "application/octet-stream" };
}

export async function createEvidence(
  row: Omit<ControlEvidence, "id" | "created_at">,
): Promise<ControlEvidence> {
  const { data, error } = await supabase
    .from("control_evidence")
    .insert(row as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as ControlEvidence;
}

export async function deleteEvidence(item: ControlEvidence): Promise<void> {
  if (item.storage_path) {
    await supabase.storage.from(BUCKET).remove([item.storage_path]);
  }
  const { error } = await supabase.from("control_evidence").delete().eq("id", item.id);
  if (error) throw error;
}

/** Short-lived signed URL — the bucket is private, never public. */
export async function signedEvidenceUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export const fileSize = (n: number) =>
  n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
