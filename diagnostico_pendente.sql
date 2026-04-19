-- ============================================================
-- DIAGNÓSTICO: Ver o estado real do usuário decolandosonhosbr@gmail.com
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Ver TUDO do perfil do usuário cadastrado
SELECT 
    id,
    email,
    full_name,
    plan,
    status,
    role,
    trial_expires_at,
    trial_activated_at,
    last_seen,
    created_at,
    updated_at
FROM profiles
WHERE email = 'decolandosonhosbr@gmail.com';

-- 2. Se quiser ver todos os usuarios recentes (últimas 24h)
SELECT 
    id,
    email,
    full_name,
    plan,
    status,
    role,
    trial_expires_at,
    last_seen,
    created_at
FROM profiles
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 3. Ver os valores DISTINTOS de 'plan' na tabela (para saber o que o trigger usa)
SELECT DISTINCT plan, COUNT(*) as total
FROM profiles
GROUP BY plan
ORDER BY total DESC;

-- 4. Ver os valores DISTINTOS de 'status'
SELECT DISTINCT status, COUNT(*) as total
FROM profiles
GROUP BY status
ORDER BY total DESC;
