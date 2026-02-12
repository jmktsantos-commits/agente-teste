-- PASSO 1: Ver todos os usuários cadastrados
SELECT 
    u.id,
    u.email,
    u.created_at as "Cadastrado em",
    p.role as "Role Atual",
    p.status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- PASSO 2: Se a coluna "Role Atual" estiver vazia (NULL), 
-- significa que o perfil não foi criado. Execute:
INSERT INTO public.profiles (id, email, role, created_at)
SELECT id, email, 'admin', created_at 
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- PASSO 3: Atualizar TODOS os usuários para admin (útil para testes)
UPDATE public.profiles SET role = 'admin';

-- PASSO 4: Verificar se funcionou
SELECT email, role FROM public.profiles;
