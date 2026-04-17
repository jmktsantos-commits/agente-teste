-- ============================================================
-- DIAGNÓSTICO E CORREÇÃO DE TRIALS
-- Execute no Supabase SQL Editor
-- ============================================================

-- ──────────────────────────────────────
-- 1. VISÃO GERAL: Todos os usuários trial
-- ──────────────────────────────────────
SELECT
    p.id,
    p.email,
    p.full_name,
    p.plan,
    p.role,
    p.trial_activated_at,
    p.trial_expires_at,
    CASE
        WHEN p.trial_expires_at IS NULL                    THEN '⚠️ SEM DATA EXPIRAÇÃO (CONGELADO)'
        WHEN p.trial_expires_at > NOW()                    THEN '✅ ATIVO — expira em ' || ROUND(EXTRACT(EPOCH FROM (p.trial_expires_at - NOW())) / 3600, 1)::TEXT || 'h'
        WHEN p.trial_expires_at <= NOW()                   THEN '🔴 EXPIRADO há ' || ROUND(EXTRACT(EPOCH FROM (NOW() - p.trial_expires_at)) / 3600, 1)::TEXT || 'h'
    END AS status_trial,
    EXTRACT(EPOCH FROM (p.trial_expires_at - p.trial_activated_at)) / 3600 AS duracao_horas
FROM public.profiles p
WHERE p.plan = 'trial'
   OR (p.plan != 'trial' AND p.trial_expires_at IS NOT NULL AND p.trial_expires_at <= NOW())
ORDER BY p.trial_activated_at DESC NULLS LAST;


-- ──────────────────────────────────────
-- 2. PROBLEMA A: Trials "congelados"
--    (plan='trial' mas trial_expires_at IS NULL ou trial_activated_at IS NULL)
-- ──────────────────────────────────────
SELECT id, email, full_name, plan, trial_activated_at, trial_expires_at
FROM public.profiles
WHERE plan = 'trial'
  AND (trial_expires_at IS NULL OR trial_activated_at IS NULL);


-- ──────────────────────────────────────
-- 3. PROBLEMA B: Expirados que ainda acessam
--    (plan='trial' e trial_expires_at <= NOW — o middleware DEVERIA bloquear)
-- ──────────────────────────────────────
SELECT id, email, full_name, plan, trial_expires_at,
       NOW() AS agora,
       trial_expires_at <= NOW() AS expirado
FROM public.profiles
WHERE plan = 'trial'
  AND trial_expires_at IS NOT NULL
  AND trial_expires_at <= NOW()
ORDER BY trial_expires_at ASC;


-- ──────────────────────────────────────
-- 4. PROBLEMA C: Usuários com plan != 'trial' mas trial expirado
--    (mudaram de plano mas continuam com role inválida)
-- ──────────────────────────────────────
SELECT id, email, full_name, plan, role, trial_expires_at
FROM public.profiles
WHERE plan NOT IN ('trial', 'free')
  AND trial_expires_at IS NOT NULL
  AND trial_expires_at <= NOW()
ORDER BY trial_expires_at DESC;


-- ============================================================
-- CORREÇÕES
-- (Descomente e execute APÓS verificar os resultados acima)
-- ============================================================

-- ── FIX A: Congelar trials sem data — define expiração como
--           72h a partir do created_at (ou now() se não tiver)
/*
UPDATE public.profiles
SET
    trial_activated_at = COALESCE(trial_activated_at, created_at, NOW()),
    trial_expires_at   = COALESCE(trial_activated_at, created_at, NOW()) + INTERVAL '72 hours'
WHERE plan = 'trial'
  AND (trial_expires_at IS NULL OR trial_activated_at IS NULL);
*/

-- ── FIX B: Expirados que ainda conseguem entrar —
--           Força bloqueio mudando plan para 'free' (sem trial ativo)
--           O middleware bloqueia apenas plan='trial' expirado,
--           mas que não seja redirect loop. Deixar como 'trial' expirado
--           JÁ DEVERIA bloquear. Investigar se há plano diferente.

-- Verificar se há plano diferente de 'trial' com acesso indevido:
SELECT id, email, full_name, plan, role, trial_expires_at
FROM public.profiles
WHERE plan NOT IN ('trial', 'free')
  AND role NOT IN ('admin', 'affiliate')
  AND trial_expires_at IS NOT NULL
  AND trial_expires_at <= NOW();

-- ── FIX C: Trails duração errada (< 72h ativos ainda)
/*
UPDATE public.profiles
SET trial_expires_at = trial_activated_at + INTERVAL '72 hours'
WHERE plan = 'trial'
  AND trial_expires_at > NOW()
  AND trial_activated_at IS NOT NULL
  AND (trial_expires_at - trial_activated_at) < INTERVAL '70 hours';
*/

-- ── FIX D: FORÇAR plano dos expirados para 'expired_trial'
--           (plano customizado que o middleware também pega)
--           OU simplesmente rely on the middleware (já faz o bloqueio)
-- Para verificar SE o middleware está funcionando:
-- O middleware bloqueia APENAS quando: plan = 'trial' AND trial_expires_at < now()
-- Se alguém está acessando com trial expirado, pode ser porque:
-- 1. O plan foi mudado para algo diferente de 'trial' (ex: 'free', 'pro')
-- 2. A session do browser está cacheada e o middleware não está sendo chamado

-- ── DIAGNÓSTICO FINAL: Checar planos de quem DEVERIA estar bloqueado ──
SELECT
    p.id,
    p.email,
    p.plan,
    p.role,
    p.trial_expires_at,
    CASE
        WHEN p.plan = 'trial' AND p.trial_expires_at <= NOW() THEN '✅ SERÁ BLOQUEADO pelo middleware'
        WHEN p.plan != 'trial' AND p.trial_expires_at <= NOW() THEN '⚠️ NÃO BLOQUEADO (plan != trial)'
        WHEN p.role IN ('admin','affiliate') THEN '🔓 ADMIN (nunca bloqueado)'
    END AS middleware_status
FROM public.profiles p
WHERE p.trial_expires_at IS NOT NULL
  AND p.trial_expires_at <= NOW()
  AND p.role NOT IN ('admin', 'affiliate')
ORDER BY p.trial_expires_at DESC;
