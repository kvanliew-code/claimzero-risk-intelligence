DROP POLICY IF EXISTS aspects_read ON public.aspects;
CREATE POLICY aspects_read ON public.aspects FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()) OR private.has_role(auth.uid(),'project_manager'::app_role));

DROP POLICY IF EXISTS sec_read ON public.stage_exit_criteria;
CREATE POLICY sec_read ON public.stage_exit_criteria FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()) OR private.has_role(auth.uid(),'project_manager'::app_role));

DROP POLICY IF EXISTS awo_read ON public.aspect_weight_overrides;
CREATE POLICY awo_read ON public.aspect_weight_overrides FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()) OR private.has_role(auth.uid(),'project_manager'::app_role));

DROP POLICY IF EXISTS escalation_rules_read ON public.escalation_rules;
CREATE POLICY escalation_rules_read ON public.escalation_rules FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()) OR private.has_role(auth.uid(),'project_manager'::app_role));

DROP POLICY IF EXISTS lifecycle_stages_read ON public.lifecycle_stages;
CREATE POLICY lifecycle_stages_read ON public.lifecycle_stages FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()) OR private.has_role(auth.uid(),'project_manager'::app_role));

DROP POLICY IF EXISTS control_register_read_staff ON public.control_register;
CREATE POLICY control_register_read_staff ON public.control_register FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()) OR private.has_role(auth.uid(),'project_manager'::app_role));

-- Applicability: match the requested family, and fail open when no rule exists.
CREATE OR REPLACE FUNCTION public.family_applies(family_code text, profile jsonb)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE((
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
    WHERE r.family_code = family_applies.family_code
    LIMIT 1
  ), true);
$function$;