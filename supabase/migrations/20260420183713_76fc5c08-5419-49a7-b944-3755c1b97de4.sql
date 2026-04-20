INSERT INTO public.user_roles (user_id, role)
VALUES ('c2ff03de-27da-452c-a27b-b05e5d9b765d', 'company')
ON CONFLICT (user_id) DO NOTHING;