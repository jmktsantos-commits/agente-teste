-- ============================================================
-- CORREÇÃO EMERGENCIAL: Bloquear todos os trials expirados
-- que ainda conseguem acessar a plataforma.
-- Execute no Supabase SQL Editor AGORA.
-- ============================================================

-- 1. Ver quem está com trial expirado e ainda com plano ativo
SELECT
    id, email, full_name, plan, role,
    trial_activated_at,
    trial_expires_at,
    NOW() AS agora,
    ROUND(EXTRACT(EPOCH FROM (NOW() - trial_expires_at)) / 3600, 1) AS horas_expirado
FROM public.profiles
WHERE trial_expires_at IS NOT NULL
  AND trial_expires_at <= NOW()
  AND role NOT IN ('admin', 'affiliate')
ORDER BY trial_expires_at DESC;

-- ──────────────────────────────────────────────────────────────
-- 2. CORREÇÃO: Garante que todos os trials expirados têm
--    plan='trial' (para o middleware bloquear corretamente).
--    Quem tinha plan='free' ou outro valor após expirar é corrigido.
-- ──────────────────────────────────────────────────────────────
UPDATE public.profiles
SET plan = 'trial'
WHERE trial_expires_at IS NOT NULL
  AND trial_expires_at <= NOW()
  AND role NOT IN ('admin', 'affiliate')
  AND plan NOT IN ('pro', 'vip', 'starter', 'anual', 'black', 'paid', 'premium', 'active', 'monthly', 'annual');

-- Confirmação
SELECT id, email, full_name, plan, trial_expires_at
FROM public.profiles
WHERE trial_expires_at IS NOT NULL
  AND trial_expires_at <= NOW()
  AND role NOT IN ('admin', 'affiliate')
ORDER BY trial_expires_at DESC;

-- ──────────────────────────────────────────────────────────────
-- 3. FIX ESPECÍFICO: André Roque (busca pelo nome e bloqueia)
-- ──────────────────────────────────────────────────────────────
-- Ver o André:
SELECT id, email, full_name, plan, role, trial_expires_at
FROM public.profiles
WHERE full_name ILIKE '%andr%roque%'
   OR full_name ILIKE '%andre%roque%'
   OR email ILIKE '%andr%';

-- Bloquear o André (substituir ID se necessário):
-- UPDATE public.profiles
-- SET plan = 'trial',
--     trial_expires_at = '1970-01-01T00:00:00Z'
-- WHERE full_name ILIKE '%andr%roque%'
--   AND role NOT IN ('admin', 'affiliate');
