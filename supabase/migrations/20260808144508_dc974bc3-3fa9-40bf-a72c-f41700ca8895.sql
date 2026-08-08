-- 1) Harden private.is_commercial: explicit null guard, narrow role list, locked execute
CREATE OR REPLACE FUNCTION private.is_commercial(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin'::public.app_role, 'executive'::public.app_role)
  )
$function$;

REVOKE ALL ON FUNCTION private.is_commercial(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_commercial(uuid) TO authenticated, service_role;

-- 2) Single, explicit reader predicate for shared methodology configuration
CREATE OR REPLACE FUNCTION private.can_read_methodology(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL AND (
    private.is_staff(_user_id)
    OR (
      private.has_role(_user_id, 'project_manager'::public.app_role)
      AND EXISTS (SELECT 1 FROM public.project_assignments pa WHERE pa.user_id = _user_id)
    )
  )
$function$;

REVOKE ALL ON FUNCTION private.can_read_methodology(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_read_methodology(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS aspects_read ON public.aspects;
CREATE POLICY aspects_read ON public.aspects FOR SELECT TO authenticated
  USING (private.can_read_methodology(auth.uid()));

DROP POLICY IF EXISTS control_register_read_staff ON public.control_register;
CREATE POLICY control_register_read_staff ON public.control_register FOR SELECT TO authenticated
  USING (private.can_read_methodology(auth.uid()));

DROP POLICY IF EXISTS escalation_rules_read ON public.escalation_rules;
CREATE POLICY escalation_rules_read ON public.escalation_rules FOR SELECT TO authenticated
  USING (private.can_read_methodology(auth.uid()));

DROP POLICY IF EXISTS lifecycle_stages_read ON public.lifecycle_stages;
CREATE POLICY lifecycle_stages_read ON public.lifecycle_stages FOR SELECT TO authenticated
  USING (private.can_read_methodology(auth.uid()));

DROP POLICY IF EXISTS sec_read ON public.stage_exit_criteria;
CREATE POLICY sec_read ON public.stage_exit_criteria FOR SELECT TO authenticated
  USING (private.can_read_methodology(auth.uid()));

DROP POLICY IF EXISTS awo_read ON public.aspect_weight_overrides;
CREATE POLICY awo_read ON public.aspect_weight_overrides FOR SELECT TO authenticated
  USING (private.can_read_methodology(auth.uid()));

DROP POLICY IF EXISTS aspect_id_history_read ON public.aspect_id_history;
CREATE POLICY aspect_id_history_read ON public.aspect_id_history FOR SELECT TO authenticated
  USING (private.can_read_methodology(auth.uid()));