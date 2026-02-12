-- Este script vai promover seu usuário atual para admin
-- Execute no SQL Editor do Supabase

-- 1. Primeiro, veja todos os usuários e seus roles atuais
SELECT id, email, role, status FROM public.profiles;

-- 2. Copie o ID do seu usuário da lista acima e cole abaixo substituindo 'SEU_USER_ID_AQUI'
-- OU use este comando que atualiza o primeiro usuário encontrado:

-- Atualizar o usuário pelo email (SUBSTITUA pelo seu email)
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'seu-email@exemplo.com';

-- OU atualizar pelo ID (se você souber o ID)
-- UPDATE public.profiles 
-- SET role = 'admin' 
-- WHERE id = 'cole-o-uuid-aqui';

-- 3. Verificar se funcionou
SELECT id, email, role, status FROM public.profiles WHERE role = 'admin';
