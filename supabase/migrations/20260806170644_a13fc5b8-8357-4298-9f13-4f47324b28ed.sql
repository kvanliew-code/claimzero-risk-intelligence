DO $$ BEGIN
  CREATE TYPE public.entity_tag AS ENUM ('CLAIMZERO','RESOLUTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS referred_by_contact_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entity_tag public.entity_tag NOT NULL DEFAULT 'CLAIMZERO',
  ADD COLUMN IF NOT EXISTS loss_reason_code text,
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS engagement_id uuid REFERENCES public.engagements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id integer;

UPDATE public.opportunities
  SET loss_reason_code = NULLIF(btrim(loss_reason), '')
  WHERE loss_reason_code IS NULL;

ALTER TABLE public.opportunities DROP CONSTRAINT IF EXISTS opportunities_loss_reason_required;
ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_loss_reason_code_required
  CHECK (stage <> 'LOST'::public.opportunity_stage OR (loss_reason_code IS NOT NULL AND length(btrim(loss_reason_code)) > 0));

CREATE OR REPLACE FUNCTION public.opportunities_scope_flag()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  IF upper(replace(btrim(coalesce(NEW.org_type,'')), ' ', '_')) = 'PUBLIC_AGENCY' THEN
    NEW.out_of_scope := true;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS opportunities_scope_flag_trg ON public.opportunities;
CREATE TRIGGER opportunities_scope_flag_trg
  BEFORE INSERT OR UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.opportunities_scope_flag();

UPDATE public.opportunities SET out_of_scope = true
  WHERE upper(replace(btrim(org_type),' ','_')) = 'PUBLIC_AGENCY';

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_read_staff ON public.app_settings;
CREATE POLICY app_settings_read_staff ON public.app_settings
  FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS app_settings_write_admin ON public.app_settings;
CREATE POLICY app_settings_write_admin ON public.app_settings
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS app_settings_touch ON public.app_settings;
CREATE TRIGGER app_settings_touch BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (key, value)
VALUES ('reviewer_days_available_per_month', '20'::jsonb)
ON CONFLICT (key) DO NOTHING;