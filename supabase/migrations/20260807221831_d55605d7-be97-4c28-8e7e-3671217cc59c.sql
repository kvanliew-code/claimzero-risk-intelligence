DELETE FROM public.user_roles WHERE user_id IN (
  '82ef2ee4-7ecc-41e9-bb68-82435798afea',
  'fdae2ab9-7e3c-484e-abb1-4896505a9553',
  'bb32dda5-bad9-4241-8c22-294b519d200f'
);
INSERT INTO public.user_roles (user_id, role) VALUES
  ('82ef2ee4-7ecc-41e9-bb68-82435798afea','admin'),
  ('fdae2ab9-7e3c-484e-abb1-4896505a9553','executive'),
  ('bb32dda5-bad9-4241-8c22-294b519d200f','reviewer'),
  ('fa33c8e9-e941-489c-9c2c-98861e945564','project_manager')
ON CONFLICT DO NOTHING;