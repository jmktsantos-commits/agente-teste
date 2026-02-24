-- ============================================================
-- Adiciona coluna plan_name à tabela crm_leads
-- Execute no Supabase -> SQL Editor
-- ============================================================

ALTER TABLE public.crm_leads
    ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT NULL;

COMMENT ON COLUMN public.crm_leads.plan_name IS 'Plano adquirido pelo cliente (ex: Mensal, Anual)';
