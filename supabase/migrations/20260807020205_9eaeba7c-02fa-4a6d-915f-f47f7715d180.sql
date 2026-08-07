-- Methodology tables: staff-only reads
DROP POLICY IF EXISTS aspects_read ON public.aspects;
CREATE POLICY aspects_read ON public.aspects FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS sec_read ON public.stage_exit_criteria;
CREATE POLICY sec_read ON public.stage_exit_criteria FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS awo_read ON public.aspect_weight_overrides;
CREATE POLICY awo_read ON public.aspect_weight_overrides FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS escalation_rules_read ON public.escalation_rules;
CREATE POLICY escalation_rules_read ON public.escalation_rules FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS lifecycle_stages_read ON public.lifecycle_stages;
CREATE POLICY lifecycle_stages_read ON public.lifecycle_stages FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS control_register_read_staff ON public.control_register;
CREATE POLICY control_register_read_staff ON public.control_register FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS projects_read_staff ON public.projects;
CREATE POLICY projects_read_staff ON public.projects FOR SELECT TO authenticated USING (
  private.is_staff(auth.uid())
  OR EXISTS (SELECT 1 FROM public.project_assignments pa WHERE pa.user_id = auth.uid() AND pa.project_id = projects.id)
);

-- Applicability lookup must not depend on the caller's row visibility
CREATE OR REPLACE FUNCTION public.get_project_family_applicability(p_project_id integer)
 RETURNS TABLE(family_code text, applies boolean, reason text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.family_code, r.applies, r.reason
  FROM public.projects p
  CROSS JOIN LATERAL public.get_family_applicability_reasons(public.project_profile_jsonb(p)) r
  WHERE p.id = p_project_id;
$function$;

-- Remove the demo account entirely
DELETE FROM public.project_assignments WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'demo@claimzero.at');
DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'demo@claimzero.at');
DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'demo@claimzero.at');
DELETE FROM auth.users WHERE email = 'demo@claimzero.at';