-- ============================================================
-- ATUALIZAR DURAÇÃO DO TRIAL: 72h → 7 DIAS (168 horas)
-- Execute no Supabase SQL Editor
-- ============================================================

-- ── 1. Atualizar a função RPC activate_trial no banco
--    (é ela que calcula trial_expires_at quando o usuário clica "Ativar")
CREATE OR REPLACE FUNCTION public.activate_trial(
    p_user_id UUID,
    p_partner_ref TEXT DEFAULT NULL,
    p_activated_by TEXT DEFAULT 'auto'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_expires_at TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Buscar o perfil
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

    -- Já tem trial ativo?
    IF v_profile.trial_expires_at IS NOT NULL AND v_profile.trial_expires_at > v_now THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Trial já está ativo',
            'expires_at', v_profile.trial_expires_at
        );
    END IF;

    -- 7 DIAS a partir de agora (168h)
    v_expires_at := v_now + INTERVAL '7 days';

    -- Atualizar profile
    UPDATE profiles
    SET
        plan               = 'trial',
        trial_activated_at = v_now,
        trial_activated_by = p_activated_by,
        trial_expires_at   = v_expires_at,
        partner_ref        = COALESCE(p_partner_ref, partner_ref)
    WHERE id = p_user_id;

    RETURN json_build_object(
        'success',      true,
        'expires_at',   v_expires_at,
        'hours',        168,
        'message',      'Trial de 7 dias ativado com sucesso!'
    );
END;
$$;

-- ── 2. Verificar: listar trials ativos com nova duração esperada
SELECT
    p.email,
    p.trial_activated_at,
    p.trial_expires_at,
    ROUND(EXTRACT(EPOCH FROM (p.trial_expires_at - p.trial_activated_at)) / 3600) AS horas_total,
    CASE
        WHEN ROUND(EXTRACT(EPOCH FROM (p.trial_expires_at - p.trial_activated_at)) / 3600) >= 160 THEN '✅ 7 dias'
        WHEN ROUND(EXTRACT(EPOCH FROM (p.trial_expires_at - p.trial_activated_at)) / 3600) BETWEEN 70 AND 80 THEN '⚠️ Ainda 72h (antigo)'
        ELSE '❓ Outro'
    END AS configuracao
FROM profiles p
WHERE p.plan = 'trial' AND p.trial_expires_at > NOW()
ORDER BY p.trial_expires_at DESC;
