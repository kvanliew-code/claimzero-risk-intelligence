-- Step 1: Create projects table with 23 profile fields
CREATE TABLE public.projects (
  id integer PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'Pre-Acquisition',
  size_m numeric NOT NULL DEFAULT 0,
  idx integer NOT NULL DEFAULT 0,
  exposure numeric NOT NULL DEFAULT 0,
  top_risk text NOT NULL DEFAULT '',
  top_aspect text NOT NULL DEFAULT '',
  engagement_level text NOT NULL DEFAULT 'ESSENTIAL',
  current_stage integer NOT NULL DEFAULT 1,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  engagement_id uuid REFERENCES public.engagements(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  asset_class text[] NOT NULL DEFAULT '{}',
  delivery_model text NOT NULL DEFAULT '',
  contract_form text NOT NULL DEFAULT '',
  architect_agreement text NOT NULL DEFAULT '',
  project_tier text NOT NULL DEFAULT 'ESSENTIAL',
  contract_value_band text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  county_jurisdiction text NOT NULL DEFAULT '',
  hvhz boolean NOT NULL DEFAULT false,
  threshold_building boolean NOT NULL DEFAULT false,
  building_height_stories integer NOT NULL DEFAULT 0,
  below_grade_levels integer NOT NULL DEFAULT 0,
  site_condition text NOT NULL DEFAULT '',
  entitlement_status text NOT NULL DEFAULT '',
  capital_structure text[] NOT NULL DEFAULT '{}',
  sales_structure text NOT NULL DEFAULT '',
  schedule_software text NOT NULL DEFAULT '',
  native_schedule_files_required boolean NOT NULL DEFAULT false,
  labor_market text NOT NULL DEFAULT '',
  occupancy_phasing text NOT NULL DEFAULT '',
  public_funding boolean NOT NULL DEFAULT false,
  historic_designation boolean NOT NULL DEFAULT false,
  ground_lease boolean NOT NULL DEFAULT false
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_admin_write" ON public.projects
  TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "projects_read_staff" ON public.projects FOR SELECT
  TO authenticated USING (private.is_staff(auth.uid()) OR private.has_role(auth.uid(), 'project_manager'::app_role));

CREATE TRIGGER projects_touch BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 2: Create family_applicability_rules table
CREATE TABLE public.family_applicability_rules (
  family_code text PRIMARY KEY,
  stage_number integer NOT NULL,
  family_name text NOT NULL DEFAULT '',
  asset_classes text[],
  delivery_models text[],
  predicates jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason_template text,
  rule_source text NOT NULL DEFAULT 'DEFAULT_ALL',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.family_applicability_rules TO authenticated;
GRANT ALL ON public.family_applicability_rules TO service_role;
ALTER TABLE public.family_applicability_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_applicability_rules_read_staff" ON public.family_applicability_rules FOR SELECT
  TO authenticated USING (private.is_staff(auth.uid()));

CREATE POLICY "family_applicability_rules_admin_write" ON public.family_applicability_rules
  TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER family_applicability_rules_touch BEFORE UPDATE ON public.family_applicability_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 3: Predicate evaluator functions
CREATE OR REPLACE FUNCTION public.project_profile_jsonb(p public.projects)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'asset_class', COALESCE(to_jsonb(p.asset_class), '[]'::jsonb),
    'delivery_model', p.delivery_model,
    'contract_form', p.contract_form,
    'architect_agreement', p.architect_agreement,
    'project_tier', p.project_tier,
    'contract_value_band', p.contract_value_band,
    'state', p.state,
    'county_jurisdiction', p.county_jurisdiction,
    'hvhz', p.hvhz,
    'threshold_building', p.threshold_building,
    'building_height_stories', p.building_height_stories,
    'below_grade_levels', p.below_grade_levels,
    'site_condition', p.site_condition,
    'entitlement_status', p.entitlement_status,
    'capital_structure', COALESCE(to_jsonb(p.capital_structure), '[]'::jsonb),
    'sales_structure', p.sales_structure,
    'schedule_software', p.schedule_software,
    'native_schedule_files_required', p.native_schedule_files_required,
    'labor_market', p.labor_market,
    'occupancy_phasing', p.occupancy_phasing,
    'public_funding', p.public_funding,
    'historic_designation', p.historic_designation,
    'ground_lease', p.ground_lease
  );
$$;

CREATE OR REPLACE FUNCTION public.evaluate_predicate(profile jsonb, predicate jsonb)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT CASE (predicate->>'op')
    WHEN '==' THEN profile->>(predicate->>'field') = predicate->'values'->>0
    WHEN '!=' THEN profile->>(predicate->>'field') <> predicate->'values'->>0
    WHEN '>=' THEN COALESCE((profile->>(predicate->>'field'))::numeric, 0) >= (predicate->'values'->>0)::numeric
    WHEN 'in' THEN profile->>(predicate->>'field') = ANY(ARRAY(SELECT jsonb_array_elements_text(predicate->'values')))
    WHEN 'includes' THEN EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(COALESCE(profile->(predicate->>'field'), '[]'::jsonb)) AS sel
      WHERE sel = ANY(ARRAY(SELECT jsonb_array_elements_text(predicate->'values')))
    )
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.family_applies(family_code text, profile jsonb)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT (
    (r.asset_classes IS NULL OR EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(COALESCE(profile->'asset_class', '[]'::jsonb)) AS sel
      WHERE sel = ANY(r.asset_classes)
    ))
    AND
    (r.delivery_models IS NULL OR profile->>'delivery_model' = ANY(r.delivery_models))
    AND
    COALESCE((
      SELECT bool_and(
        CASE WHEN (p->>'not')::boolean THEN NOT public.evaluate_predicate(profile, p)
             ELSE public.evaluate_predicate(profile, p)
        END
      )
      FROM jsonb_array_elements(r.predicates) AS p
    ), true)
  )
  FROM public.family_applicability_rules r
  WHERE r.family_code = family_code;
$$;

CREATE OR REPLACE FUNCTION public.get_applicable_families(profile jsonb)
RETURNS SETOF text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT r.family_code
  FROM public.family_applicability_rules r
  WHERE public.family_applies(r.family_code, profile);
$$;

CREATE OR REPLACE FUNCTION public.get_family_applicability_reasons(profile jsonb)
RETURNS TABLE(family_code text, applies boolean, reason text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT
    r.family_code,
    public.family_applies(r.family_code, profile) AS applies,
    CASE WHEN public.family_applies(r.family_code, profile) THEN NULL
         ELSE COALESCE(r.reason_template, 'Family does not apply to this project profile')
    END AS reason
  FROM public.family_applicability_rules r;
$$;

-- Step 4: Tier rename on control_register
ALTER TABLE public.control_register DROP CONSTRAINT control_register_min_tier_check;
UPDATE public.control_register SET min_tier = CASE min_tier
  WHEN 'A' THEN 'CORE'
  WHEN 'B' THEN 'EXTENDED'
  WHEN 'C' THEN 'COMPREHENSIVE'
  ELSE min_tier
END;
ALTER TABLE public.control_register ALTER COLUMN min_tier DROP DEFAULT;
ALTER TABLE public.control_register ADD CONSTRAINT control_register_min_tier_check
  CHECK (min_tier = ANY (ARRAY['CORE'::text, 'EXTENDED'::text, 'COMPREHENSIVE'::text]));

-- Step 5: Add mitigation_template to control_register
ALTER TABLE public.control_register ADD COLUMN mitigation_template text NULL;