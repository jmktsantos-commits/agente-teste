-- ============================================================
-- CLEANUP + FIX: Remove conversas duplicadas e previne criação futura
-- Execute no Supabase -> SQL Editor
-- ============================================================

-- 1. Remover conversas duplicadas (mantém apenas a mais antiga por lead+channel)
DELETE FROM public.crm_conversations
WHERE id NOT IN (
    SELECT DISTINCT ON (lead_id, channel) id
    FROM public.crm_conversations
    ORDER BY lead_id, channel, created_at ASC
);

-- 2. Adicionar constraint única para prevenir duplicatas futuras
ALTER TABLE public.crm_conversations
    DROP CONSTRAINT IF EXISTS crm_conversations_lead_channel_unique;

ALTER TABLE public.crm_conversations
    ADD CONSTRAINT crm_conversations_lead_channel_unique
    UNIQUE (lead_id, channel);

-- Verificar resultado
SELECT COUNT(*) AS total_conversations FROM public.crm_conversations;
