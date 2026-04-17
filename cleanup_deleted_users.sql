-- ============================================================
-- LIMPEZA E SINCRONIZAÇÃO APÓS DELEÇÃO DE USUÁRIOS
-- Execute no Supabase SQL Editor — bloco a bloco
-- ============================================================

-- ── 1. DIAGNÓSTICO: auth.users sem profile correspondente
--    (podem ainda fazer login mas causam comportamento inesperado)
SELECT
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    p.id AS profile_id
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ORDER BY au.last_sign_in_at DESC NULLS LAST;

-- ── 2. DIAGNÓSTICO: profiles sem auth.users correspondente
--    (órfãos — não deveriam existir)
SELECT p.*
FROM public.profiles p
LEFT JOIN auth.users au ON au.id = p.id
WHERE au.id IS NULL;

-- ── 3. LIMPEZA: deletar registros orphãos de profiles
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- ── 4. LIMPEZA: deletar auth.users que não têm profile
--    (usuários que você removeu do profiles mas o auth record ficou)
--    ⚠️ Isso impede que eles façam login novamente.
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- ── 5. CONFIRMAR: listar quem sobrou (os que devem ficar)
SELECT
    au.email,
    p.full_name,
    p.plan,
    p.role,
    p.trial_expires_at,
    CASE
        WHEN p.role IN ('admin','affiliate') THEN '✅ Admin/Afiliado'
        WHEN ARRAY[p.plan] && ARRAY['pro','vip','starter','anual','black','premium','paid','active','monthly','annual'] THEN '✅ Plano Pago'
        WHEN p.trial_expires_at IS NULL THEN '⚠️ Sem data de trial'
        WHEN p.trial_expires_at > NOW() THEN '🟢 Trial Ativo'
        ELSE '🔴 Trial Expirado'
    END AS status
FROM auth.users au
JOIN public.profiles p ON p.id = au.id
ORDER BY p.role DESC, au.email;
