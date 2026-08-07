-- Revert the applicability lookup to SECURITY INVOKER so it inherits the caller's
-- row visibility on public.projects, and add an explicit authorization gate so it
-- can never return rows for a project the caller is not staff on or assigned to.
CREATE OR REPLACE FUNCTION public.get_project_family_applicability(p_project_id integer)
RETURNS TABLE(family_code text, applies boolean, reason text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT r.family_code, r.applies, r.reason
  FROM public.projects p
  CROSS JOIN LATERAL public.get_family_applicability_reasons(public.project_profile_jsonb(p)) r
  WHERE p.id = p_project_id
    AND (
      private.is_staff(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.project_assignments pa
        WHERE pa.user_id = auth.uid()
          AND pa.project_id = p_project_id
      )
    );
$function$;

REVOKE ALL ON FUNCTION public.get_project_family_applicability(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_family_applicability(integer) TO authenticated, service_role;