-- ============================================================
-- FIX: Remover duplicatas de crm_leads e prevenir recorrência
-- Execute no Supabase -> SQL Editor
-- ============================================================

-- ── PASSO 1: Mover conversas de leads duplicados para o lead mais antigo ──────
-- Para cada grupo de leads com mesmo user_id, mantemos o mais antigo
-- e transferimos as conversas dos duplicados para ele.

WITH oldest_leads AS (
    -- O lead mais antigo por user_id
    SELECT DISTINCT ON (user_id) id, user_id
    FROM public.crm_leads
    WHERE user_id IS NOT NULL
    ORDER BY user_id, created_at ASC
),
dup_leads AS (
    -- Todos os outros leads com o mesmo user_id (os duplicados)
    SELECT l.id AS dup_id, ol.id AS master_id
    FROM public.crm_leads l
    JOIN oldest_leads ol ON l.user_id = ol.user_id
    WHERE l.id <> ol.id
)
-- Mover conversas do duplicado para o master
UPDATE public.crm_conversations
SET lead_id = dl.master_id
FROM dup_leads dl
WHERE public.crm_conversations.lead_id = dl.dup_id;

-- ── PASSO 2: Mover conversas por email (user_id NULL) ─────────────────────────
WITH oldest_by_email AS (
    SELECT DISTINCT ON (email) id, email
    FROM public.crm_leads
    WHERE email IS NOT NULL AND user_id IS NULL
    ORDER BY email, created_at ASC
),
dup_by_email AS (
    SELECT l.id AS dup_id, oe.id AS master_id
    FROM public.crm_leads l
    JOIN oldest_by_email oe ON l.email = oe.email
    WHERE l.id <> oe.id AND l.user_id IS NULL
)
UPDATE public.crm_conversations
SET lead_id = de.master_id
FROM dup_by_email de
WHERE public.crm_conversations.lead_id = de.dup_id;

-- ── PASSO 3: Remover leads duplicados (user_id - mantém o mais antigo) ────────
DELETE FROM public.crm_leads
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id
    FROM public.crm_leads
    WHERE user_id IS NOT NULL
    ORDER BY user_id, created_at ASC
)
AND user_id IS NOT NULL;

-- ── PASSO 4: Remover leads duplicados (email sem user_id) ─────────────────────
DELETE FROM public.crm_leads
WHERE id NOT IN (
    SELECT DISTINCT ON (email) id
    FROM public.crm_leads
    WHERE email IS NOT NULL AND user_id IS NULL
    ORDER BY email, created_at ASC
)
AND email IS NOT NULL
AND user_id IS NULL;

-- ── PASSO 5: Adicionar constraint única para evitar duplicatas futuras ─────────
ALTER TABLE public.crm_leads
    DROP CONSTRAINT IF EXISTS crm_leads_user_id_unique;

ALTER TABLE public.crm_leads
    ADD CONSTRAINT crm_leads_user_id_unique UNIQUE (user_id);

-- Verificar resultado
SELECT COUNT(*) AS total_leads_after_cleanup FROM public.crm_leads;
