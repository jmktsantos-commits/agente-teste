-- ============================================================
-- CORREÇÃO URGENTE — Execute passo a passo no Supabase SQL Editor
-- ============================================================

-- PASSO 1: Ver todos os usuários que cadastraram mas ainda não têm trial ativo
-- (esses devem aparecer como "pendentes" no painel)
SELECT 
    id,
    email,
    full_name,
    status,
    plan,
    trial_expires_at,
    last_seen,
    created_at
FROM profiles
WHERE role NOT IN ('admin', 'affiliate')
  AND plan = 'trial'
  AND trial_expires_at IS NULL
ORDER BY created_at DESC;

-- ============================================================
-- PASSO 2: Corrigir esses usuários — marcar como pending e limpar last_seen
-- (rode após confirmar o resultado do PASSO 1)
-- ============================================================
UPDATE profiles
SET 
    status   = 'pending',
    last_seen = NULL
WHERE role NOT IN ('admin', 'affiliate')
  AND plan = 'trial'
  AND trial_expires_at IS NULL;

-- ============================================================
-- PASSO 3: Atualizar o trigger handle_new_user para cadastros futuros
-- (novos usuários serão criados com status='pending' e last_seen=NULL)
-- ============================================================

-- Primeiro: ver como está o trigger atual
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- Depois: atualizar (adapte as colunas se necessário — rode o SELECT acima antes)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_full_name TEXT;
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        plan,
        status,
        last_seen,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        'user',
        'trial',
        'pending',   -- aguarda aprovação do admin
        NULL,        -- não aparece online
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email      = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- Confirmar que o trigger está associado à tabela auth.users
SELECT tgname, tgtype, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname ILIKE '%new_user%';
