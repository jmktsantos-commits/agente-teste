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
--    Ordem correta para respeitar as foreign keys:
--    crm_leads → affiliates → auth.users

-- 4a. Remover referência em crm_leads para os afiliados que serão deletados
UPDATE public.crm_leads
SET affiliate_id = NULL
WHERE affiliate_id IN (
    SELECT au.id
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
);

-- 4b. Deletar registros na tabela affiliates vinculados aos usuários sem profile
DELETE FROM public.affiliates
WHERE id IN (
    SELECT au.id
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
);

-- 4c. Agora sim: deletar os auth.users sem profile
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
