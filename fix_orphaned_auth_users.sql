-- ============================================================
-- FIX: Deletar usuários "órfãos" — estão em auth.users mas
-- não têm mais entrada em public.profiles (remoção incompleta)
-- Execute no Supabase -> SQL Editor
-- ============================================================

-- Ver quais usuários órfãos existem antes de deletar
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- DELETAR todos os usuários órfãos (auth.users sem profiles)
-- Com ON DELETE CASCADE no profiles, isso é seguro.
DELETE FROM auth.users
WHERE id IN (
    SELECT u.id
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
);

-- Confirmar
SELECT COUNT(*) AS usuarios_orfaos_restantes
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
