-- =============================================
-- FIX 24h -> 72h TRIAL DURATION PARA CONTAS EXISTENTES
-- Execute no Supabase SQL Editor
-- =============================================

-- Atualiza todo mundo que tem plano='trial', que ainda não expirou,
-- para adicionar mais 48 horas no vencimento (já que o original era 24h e agora são 72h).
UPDATE public.profiles
SET trial_expires_at = trial_expires_at + INTERVAL '48 hours'
WHERE plan = 'trial' 
  AND trial_expires_at > NOW()
  -- Opcional: só adicionar se a duração total (expires - activated) for menor que 72h (3 days)
  AND (trial_expires_at - trial_activated_at) <= INTERVAL '2 days';
