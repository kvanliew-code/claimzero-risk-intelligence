REVOKE ALL ON FUNCTION public.get_project_family_applicability(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_family_applicability(integer) TO authenticated, service_role;