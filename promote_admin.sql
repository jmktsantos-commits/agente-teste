-- Promote test user to admin
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'teste@teste.com';
