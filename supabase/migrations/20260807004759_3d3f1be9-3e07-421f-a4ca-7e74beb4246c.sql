CREATE OR REPLACE FUNCTION public.get_project_family_applicability(p_project_id integer)
RETURNS TABLE(family_code text, applies boolean, reason text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT r.family_code, r.applies, r.reason
  FROM public.projects p
  CROSS JOIN LATERAL public.get_family_applicability_reasons(public.project_profile_jsonb(p)) r
  WHERE p.id = p_project_id;
$$;