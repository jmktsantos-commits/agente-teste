-- ============================================================
-- CORREÇÃO DEFINITIVA DE TRIALS
-- O problema: trial_expires_at foi resetado incorretamente para
-- "agora + 72h" mesmo para usuários antigos. A fonte de verdade
-- é a data de CRIAÇÃO do usuário (created_at).
-- ============================================================

-- 1. DIAGNÓSTICO: Ver quem está ativo mas created_at tem mais de 72h
SELECT
    p.id,
    p.email,
    p.full_name,
    p.plan,
    au.created_at                                              AS conta_criada_em,
    p.trial_activated_at,
    p.trial_expires_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - au.created_at)) / 3600, 1) AS horas_desde_criacao,
    ROUND(EXTRACT(EPOCH FROM (p.trial_expires_at - NOW())) / 3600, 1) AS horas_restantes_exibidas,
    CASE
        WHEN EXTRACT(EPOCH FROM (NOW() - au.created_at)) / 3600 > 72
        THEN '🔴 DEVERIA ESTAR EXPIRADO (conta > 72h)'
        ELSE '✅ Dentro do prazo'
    END AS real_status
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE p.plan = 'trial'
  AND p.trial_expires_at > NOW()
  AND p.role NOT IN ('admin', 'affiliate')
ORDER BY au.created_at ASC;

-- ============================================================
-- CORREÇÃO: Recalcula trial_expires_at baseado em created_at
-- (72h a partir da criação da conta, não do reset manual)
-- Para quem já passou das 72h desde a criação → expira agora
-- ============================================================
UPDATE public.profiles p
SET
    trial_activated_at = au.created_at,
    trial_expires_at   = au.created_at + INTERVAL '72 hours'
FROM auth.users au
WHERE p.id = au.id
  AND p.plan = 'trial'
  AND p.role NOT IN ('admin', 'affiliate')
  AND au.created_at + INTERVAL '72 hours' < NOW();  -- já passou das 72h desde criação

-- Confirmar resultado depois do UPDATE:
SELECT
    p.email,
    p.full_name,
    au.created_at                                              AS conta_criada,
    p.trial_expires_at,
    CASE WHEN p.trial_expires_at <= NOW() THEN '🔴 EXPIRADO' ELSE '✅ ATIVO' END AS status
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE p.plan = 'trial'
  AND p.role NOT IN ('admin', 'affiliate')
ORDER BY au.created_at DESC;
