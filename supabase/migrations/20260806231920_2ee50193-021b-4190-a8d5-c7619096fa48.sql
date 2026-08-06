CREATE TABLE public.control_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id integer NOT NULL,
  control_id text NOT NULL,
  document_name text NOT NULL DEFAULT '',
  storage_path text NOT NULL DEFAULT '',
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT '',
  page_ref text NOT NULL DEFAULT '',
  clause_ref text NOT NULL DEFAULT '',
  excerpt text NOT NULL DEFAULT '',
  source_class text NOT NULL DEFAULT 'CONTEMPORANEOUS_PROJECT_RECORD',
  confidence text NOT NULL DEFAULT 'FULL',
  document_date date,
  captured_by uuid,
  captured_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX control_evidence_project_control_idx ON public.control_evidence (project_id, control_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.control_evidence TO authenticated;
GRANT ALL ON public.control_evidence TO service_role;

ALTER TABLE public.control_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY control_evidence_read ON public.control_evidence
FOR SELECT TO authenticated
USING (
  private.is_staff(auth.uid())
  OR EXISTS (SELECT 1 FROM public.project_assignments pa
             WHERE pa.user_id = auth.uid() AND pa.project_id = control_evidence.project_id)
);

CREATE POLICY control_evidence_write ON public.control_evidence
FOR ALL TO authenticated
USING (
  private.is_staff(auth.uid())
  OR EXISTS (SELECT 1 FROM public.project_assignments pa
             WHERE pa.user_id = auth.uid() AND pa.project_id = control_evidence.project_id)
)
WITH CHECK (
  private.is_staff(auth.uid())
  OR EXISTS (SELECT 1 FROM public.project_assignments pa
             WHERE pa.user_id = auth.uid() AND pa.project_id = control_evidence.project_id)
);

CREATE TRIGGER control_evidence_touch BEFORE UPDATE ON public.control_evidence
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY evidence_objects_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'evidence' AND (
    private.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.project_assignments pa
               WHERE pa.user_id = auth.uid()
                 AND pa.project_id::text = (storage.foldername(name))[1])
  )
);

CREATE POLICY evidence_objects_write ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'evidence' AND (
    private.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.project_assignments pa
               WHERE pa.user_id = auth.uid()
                 AND pa.project_id::text = (storage.foldername(name))[1])
  )
);

CREATE POLICY evidence_objects_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'evidence' AND (
    private.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.project_assignments pa
               WHERE pa.user_id = auth.uid()
                 AND pa.project_id::text = (storage.foldername(name))[1])
  )
);

CREATE POLICY evidence_objects_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'evidence' AND (
    private.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.project_assignments pa
               WHERE pa.user_id = auth.uid()
                 AND pa.project_id::text = (storage.foldername(name))[1])
  )
);