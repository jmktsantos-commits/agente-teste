-- ============================================================
-- FIX: Adiciona ON DELETE CASCADE nas FK que referenciam auth.users
-- Isso permite deletar usuários sem erros de FK constraint
-- Execute no Supabase -> SQL Editor
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Remove a FK existente e recria com CASCADE
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- ── crm_leads ─────────────────────────────────────────────────────────────────
-- user_id: pode ser NULL se o lead não tiver conta. Usa SET NULL no delete.
ALTER TABLE public.crm_leads
    DROP CONSTRAINT IF EXISTS crm_leads_user_id_fkey;

ALTER TABLE public.crm_leads
    ADD CONSTRAINT crm_leads_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- ── affiliates ────────────────────────────────────────────────────────────────
ALTER TABLE public.affiliates
    DROP CONSTRAINT IF EXISTS affiliates_id_fkey;

ALTER TABLE public.affiliates
    ADD CONSTRAINT affiliates_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;


-- Confirma
SELECT 'FK constraints atualizadas com ON DELETE CASCADE' AS status;
