-- ============================================================
-- REMOVER USUÁRIO COMPLETAMENTE DO SUPABASE AUTH
-- (para quem foi removido do profiles mas ainda acessa)
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Ver quem está no auth.users mas NÃO tem profile (usuários "fantasmas")
SELECT
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    'SEM PROFILE - REMOVER' AS status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ORDER BY au.last_sign_in_at DESC NULLS LAST;

-- 2. ATENÇÃO: Execute o SELECT acima primeiro para confirmar quem será removido.
--    Depois rode o DELETE abaixo:

-- DELETE FROM auth.users
-- WHERE id IN (
--     SELECT au.id
--     FROM auth.users au
--     LEFT JOIN public.profiles p ON p.id = au.id
--     WHERE p.id IS NULL
-- );

-- 3. Para remover um usuário específico pelo email (substitua o email):
-- DELETE FROM auth.users WHERE email = 'carlospires_81@hotmail.com';
