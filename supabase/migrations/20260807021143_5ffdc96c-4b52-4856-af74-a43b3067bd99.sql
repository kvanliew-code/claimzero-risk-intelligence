CREATE TABLE public.report_definitions (
  report_key text PRIMARY KEY,
  title text NOT NULL,
  audience text NOT NULL DEFAULT '',
  decision text NOT NULL DEFAULT '',
  applicable_stages int[] NOT NULL DEFAULT '{}',
  cadence text NOT NULL DEFAULT 'ON_DEMAND',
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_definitions TO authenticated;
GRANT ALL ON public.report_definitions TO service_role;
ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_definitions_read ON public.report_definitions;
CREATE POLICY report_definitions_read ON public.report_definitions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS report_definitions_write ON public.report_definitions;
CREATE POLICY report_definitions_write ON public.report_definitions FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER report_definitions_touch BEFORE UPDATE ON public.report_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id integer NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_key text NOT NULL REFERENCES public.report_definitions(report_key),
  doc_number text NOT NULL DEFAULT '',
  revision integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'DRAFT',
  generated_by uuid,
  approved_by uuid,
  published_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reports_status_ck CHECK (status IN ('DRAFT','IN_REVIEW','APPROVED','PUBLISHED'))
);
CREATE INDEX reports_project_idx ON public.reports (project_id, report_key, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_read ON public.reports;
CREATE POLICY reports_read ON public.reports FOR SELECT TO authenticated
  USING (
    private.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.project_assignments pa
               WHERE pa.user_id = auth.uid() AND pa.project_id = reports.project_id)
  );

DROP POLICY IF EXISTS reports_insert ON public.reports;
CREATE POLICY reports_insert ON public.reports FOR INSERT TO authenticated
  WITH CHECK (
    (
      private.is_staff(auth.uid())
      OR EXISTS (SELECT 1 FROM public.project_assignments pa
                 WHERE pa.user_id = auth.uid() AND pa.project_id = reports.project_id)
    )
    AND (
      status = 'DRAFT'
      OR private.has_role(auth.uid(), 'admin'::app_role)
      OR private.has_role(auth.uid(), 'reviewer'::app_role)
    )
  );

DROP POLICY IF EXISTS reports_update ON public.reports;
CREATE POLICY reports_update ON public.reports FOR UPDATE TO authenticated
  USING (
    status <> 'PUBLISHED'
    AND (
      private.is_staff(auth.uid())
      OR EXISTS (SELECT 1 FROM public.project_assignments pa
                 WHERE pa.user_id = auth.uid() AND pa.project_id = reports.project_id)
    )
  )
  WITH CHECK (
    (
      private.is_staff(auth.uid())
      OR EXISTS (SELECT 1 FROM public.project_assignments pa
                 WHERE pa.user_id = auth.uid() AND pa.project_id = reports.project_id)
    )
    AND (
      status = 'DRAFT'
      OR private.has_role(auth.uid(), 'admin'::app_role)
      OR private.has_role(auth.uid(), 'reviewer'::app_role)
    )
  );

DROP POLICY IF EXISTS reports_delete ON public.reports;
CREATE POLICY reports_delete ON public.reports FOR DELETE TO authenticated
  USING (status = 'DRAFT' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER reports_touch BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE RESTRICT,
  project_id integer NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_by uuid,
  payload jsonb NOT NULL,
  content_hash text NOT NULL,
  prev_hash text
);
CREATE INDEX report_snapshots_project_idx ON public.report_snapshots (project_id, captured_at DESC);
GRANT SELECT, INSERT ON public.report_snapshots TO authenticated;
REVOKE UPDATE, DELETE ON public.report_snapshots FROM authenticated;
GRANT ALL ON public.report_snapshots TO service_role;
ALTER TABLE public.report_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_snapshots_read ON public.report_snapshots;
CREATE POLICY report_snapshots_read ON public.report_snapshots FOR SELECT TO authenticated
  USING (
    private.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.project_assignments pa
               WHERE pa.user_id = auth.uid() AND pa.project_id = report_snapshots.project_id)
  );

DROP POLICY IF EXISTS report_snapshots_insert ON public.report_snapshots;
CREATE POLICY report_snapshots_insert ON public.report_snapshots FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'reviewer'::app_role)
  );

CREATE OR REPLACE FUNCTION public.report_snapshot_chain()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  last_hash text;
BEGIN
  SELECT s.content_hash INTO last_hash
  FROM public.report_snapshots s
  WHERE s.project_id = NEW.project_id
  ORDER BY s.captured_at DESC, s.id DESC
  LIMIT 1;

  NEW.prev_hash := last_hash;
  NEW.captured_at := COALESCE(NEW.captured_at, now());
  NEW.content_hash := encode(
    extensions.digest(
      COALESCE(last_hash, '') || '|' || NEW.report_id::text || '|' ||
      NEW.captured_at::text || '|' || NEW.payload::text,
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER report_snapshots_chain BEFORE INSERT ON public.report_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.report_snapshot_chain();