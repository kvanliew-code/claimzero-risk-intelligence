CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','executive','reviewer')
  )
$$;

-- profiles
DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read_own ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_staff(auth.uid()));

-- user_roles
DROP POLICY IF EXISTS user_roles_read ON public.user_roles;
CREATE POLICY user_roles_read_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- project_assignments
DROP POLICY IF EXISTS assignments_read ON public.project_assignments;
CREATE POLICY assignments_read_scoped ON public.project_assignments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- clients
DROP POLICY IF EXISTS clients_read ON public.clients;
CREATE POLICY clients_read_staff ON public.clients
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- engagements
DROP POLICY IF EXISTS engagements_read ON public.engagements;
CREATE POLICY engagements_read_staff ON public.engagements
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- signup can no longer self-grant a role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  final_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, title, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.raw_user_meta_data->>'title',''),
    COALESCE(NEW.email,'')
  )
  ON CONFLICT (id) DO NOTHING;

  IF NEW.email = 'demo@claimzero.at' THEN
    final_role := 'admin';
  ELSE
    final_role := 'project_manager';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, final_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;