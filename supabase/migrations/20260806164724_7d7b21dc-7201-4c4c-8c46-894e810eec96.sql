CREATE TABLE public.review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id integer NOT NULL,
  project_name text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'risk',
  control_id text NOT NULL DEFAULT '',
  aspect_id text NOT NULL DEFAULT '',
  aspect_name text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  exposure_usd numeric NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'Watch',
  confidence text NOT NULL DEFAULT 'Medium',
  evidence_ref text NOT NULL DEFAULT '',
  source_excerpt text NOT NULL DEFAULT '',
  submitted_by text NOT NULL DEFAULT 'ClaimZero Engine',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  due_date date,
  status text NOT NULL DEFAULT 'PENDING',
  reviewer_note text NOT NULL DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_items TO authenticated;
GRANT ALL ON public.review_items TO service_role;

ALTER TABLE public.review_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY review_items_read ON public.review_items
FOR SELECT TO authenticated
USING (
  private.is_staff(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.user_id = auth.uid() AND pa.project_id = review_items.project_id
  )
);

CREATE POLICY review_items_write ON public.review_items
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'reviewer'))
WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'reviewer'));

CREATE INDEX review_items_status_idx ON public.review_items (status, submitted_at DESC);
CREATE INDEX review_items_project_idx ON public.review_items (project_id);

CREATE TRIGGER review_items_touch BEFORE UPDATE ON public.review_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();