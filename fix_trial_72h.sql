-- =============================================
-- FIX: TRIAL DURATION 24h → 72h
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. Recriar a função activate_trial com duração de 72h (3 dias)
CREATE OR REPLACE FUNCTION public.activate_trial(
  p_user_id UUID,
  p_partner_ref TEXT DEFAULT NULL,
  p_activated_by TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Não reativar se já tem plano pago
  IF v_profile.plan IN ('pro', 'vip') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário já possui plano ativo');
  END IF;

  -- Não reativar trial se ainda está ativo
  IF v_profile.plan = 'trial' AND v_profile.trial_expires_at > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trial já está ativo', 'expires_at', v_profile.trial_expires_at);
  END IF;

  -- ✅ CORRIGIDO: 72 horas (3 dias) ao invés de 24h (1 dia)
  v_expires_at := NOW() + INTERVAL '3 days';

  UPDATE public.profiles
  SET
    plan               = 'trial',
    trial_expires_at   = v_expires_at,
    trial_activated_at = NOW(),
    trial_activated_by = p_activated_by,
    partner_ref        = COALESCE(p_partner_ref, partner_ref)
  WHERE id = p_user_id;

  -- Incrementar contador do parceiro se informado
  IF p_partner_ref IS NOT NULL THEN
    UPDATE public.trial_partners
    SET trials_generated = trials_generated + 1
    WHERE code = p_partner_ref;
  END IF;

  -- Atualizar tag no CRM se lead existir
  UPDATE public.crm_leads
  SET
    tags = array_append(COALESCE(tags, '{}'), 'trial_user'),
    status = 'contacted'
  WHERE user_id = p_user_id AND NOT ('trial_user' = ANY(COALESCE(tags, '{}')));

  RETURN jsonb_build_object(
    'success', true,
    'expires_at', v_expires_at,
    'hours', 72
  );
END;
$$;

-- 2. Verificar se há trials ativos com duração < 72h e corrigi-los
--    (usuários que ativaram trial enquanto estava em 24h)
UPDATE public.profiles
SET trial_expires_at = trial_activated_at + INTERVAL '3 days'
WHERE plan = 'trial'
  AND trial_expires_at > NOW()
  AND (trial_expires_at - trial_activated_at) < INTERVAL '3 days';

-- 3. Confirmar resultado
SELECT 
  id,
  trial_activated_at,
  trial_expires_at,
  EXTRACT(EPOCH FROM (trial_expires_at - trial_activated_at)) / 3600 AS hours_duration
FROM public.profiles
WHERE plan = 'trial'
  AND trial_expires_at > NOW()
ORDER BY trial_activated_at DESC;
