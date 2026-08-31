-- Grant the admin role to the initial admin account after the auth database
-- was reset and no admin user_roles row existed anymore.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'geelenstef001@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
