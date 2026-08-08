CREATE OR REPLACE FUNCTION private.is_commercial(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','executive')
  )
$$;

REVOKE ALL ON FUNCTION private.is_commercial(uuid) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS clients_read_staff ON public.clients;
CREATE POLICY clients_read_commercial ON public.clients
  FOR SELECT TO authenticated USING (private.is_commercial(auth.uid()));

DROP POLICY IF EXISTS engagements_read_staff ON public.engagements;
CREATE POLICY engagements_read_commercial ON public.engagements
  FOR SELECT TO authenticated USING (private.is_commercial(auth.uid()));

DROP POLICY IF EXISTS opportunities_read_staff ON public.opportunities;
CREATE POLICY opportunities_read_commercial ON public.opportunities
  FOR SELECT TO authenticated USING (private.is_commercial(auth.uid()));

DROP POLICY IF EXISTS opportunities_write_staff ON public.opportunities;
CREATE POLICY opportunities_write_commercial ON public.opportunities
  FOR ALL TO authenticated
  USING (private.is_commercial(auth.uid()))
  WITH CHECK (private.is_commercial(auth.uid()));

DROP POLICY IF EXISTS reviewer_capacity_read_staff ON public.reviewer_capacity;
CREATE POLICY reviewer_capacity_read_commercial ON public.reviewer_capacity
  FOR SELECT TO authenticated USING (private.is_commercial(auth.uid()));