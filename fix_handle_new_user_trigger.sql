-- ============================================================
-- 1. VER O TRIGGER ATUAL
-- ============================================================
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- ============================================================
-- 2. ATUALIZAR O TRIGGER handle_new_user
--    Cria o profile com:
--    - status = 'pending'   (aguarda aprovação do admin)
--    - last_seen = NULL     (não aparece como "online")
--    - plan = 'trial'       (padrão para novos cadastros)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'user',
        'trial',
        'pending',   -- ← aguarda aprovação do admin
        NULL,        -- ← não aparece como online
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email      = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- ============================================================
-- 3. CORRIGIR USUÁRIOS JÁ CRIADOS COM STATUS ERRADO
--    (quem não tem trial ativo nem plano pago e não é admin)
-- ============================================================

-- Ver quem precisa ser corrigido:
SELECT id, email, full_name, status, plan, trial_expires_at, last_seen, created_at
FROM profiles
WHERE status = 'active'
  AND role NOT IN ('admin', 'affiliate')
  AND plan = 'trial'
  AND trial_expires_at IS NULL  -- trial não foi ativado ainda
ORDER BY created_at DESC;

-- Se quiser marcar esses usuários como pending (rode apenas após confirmar acima):
-- UPDATE profiles
-- SET status = 'pending', last_seen = NULL
-- WHERE status = 'active'
--   AND role NOT IN ('admin', 'affiliate')
--   AND plan = 'trial'
--   AND trial_expires_at IS NULL;
