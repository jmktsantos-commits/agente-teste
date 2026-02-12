-- Verificar se a role foi atualizada corretamente
-- Execute este comando no SQL Editor do Supabase

SELECT 
    id,
    email,
    role,
    status,
    created_at,
    last_seen
FROM public.profiles
ORDER BY created_at DESC;

-- Se você não vir nenhum resultado, significa que a tabela está vazia
-- Nesse caso, execute o comando abaixo para popular com usuários existentes:

-- INSERT INTO public.profiles (id, email, created_at)
-- SELECT id, email, created_at FROM auth.users
-- WHERE id NOT IN (SELECT id FROM public.profiles);

-- Depois, atualize a role do seu usuário (SUBSTITUA O EMAIL):
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'seu-email@exemplo.com';
