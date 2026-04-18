-- ============================================================
-- ATUALIZAR DURAÇÃO DO TRIAL: 72h → 7 DIAS (168 horas)
-- Execute no Supabase SQL Editor
-- ============================================================

-- ── 1. Dropar a função antiga
DROP FUNCTION IF EXISTS public.activate_trial(UUID, TEXT, TEXT);

-- ── 2. Recriar com duração de 7 dias
CREATE OR REPLACE FUNCTION public.activate_trial(
    p_user_id      UUID,
    p_partner_ref  TEXT DEFAULT NULL,
    p_activated_by TEXT DEFAULT 'auto'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_current_expires_at TIMESTAMPTZ;
    v_expires_at         TIMESTAMPTZ;
    v_now                TIMESTAMPTZ;
BEGIN
    v_now := NOW();

    -- Buscar trial_expires_at atual usando atribuição direta (evita ambiguidade)
    v_current_expires_at := (
        SELECT trial_expires_at FROM public.profiles WHERE id = p_user_id
    );

    -- Já tem trial ativo?
    IF v_current_expires_at IS NOT NULL AND v_current_expires_at > v_now THEN
        RETURN json_build_object(
            'success',    false,
            'error',      'Trial já está ativo',
            'expires_at', v_current_expires_at
        );
    END IF;

    -- 7 dias a partir de agora
    v_expires_at := v_now + INTERVAL '7 days';

    -- Atualizar profile
    UPDATE public.profiles
    SET
        plan               = 'trial',
        trial_activated_at = v_now,
        trial_activated_by = p_activated_by,
        trial_expires_at   = v_expires_at,
        partner_ref        = COALESCE(p_partner_ref, partner_ref)
    WHERE id = p_user_id;

    RETURN json_build_object(
        'success',    true,
        'expires_at', v_expires_at,
        'hours',      168,
        'message',    'Trial de 7 dias ativado com sucesso!'
    );
END;
$func$;

-- ── 3. Confirmar criação
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'activate_trial'
LIMIT 1;
