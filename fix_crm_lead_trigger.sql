-- ============================================================
-- FIX: Capturar telefone e plano do pagamento no CRM
-- 1. Adiciona 'payment' ao enum crm_source_type
-- 2. Atualiza o trigger para ler phone e plan_name do metadata
-- Execute no Supabase -> SQL Editor
-- ============================================================

-- 1. Adicionar 'payment' ao enum (seguro, não desfaz valores existentes)
ALTER TYPE crm_source_type ADD VALUE IF NOT EXISTS 'payment';

-- 2. Adicionar coluna plan_name se ainda não existir
ALTER TABLE public.crm_leads
    ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT NULL;

-- 3. Recriar o trigger para ler phone e plan_name do metadata do usuário
CREATE OR REPLACE FUNCTION public.sync_user_to_crm()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_name TEXT;
    v_phone     TEXT;
    v_source    TEXT;
    v_status    TEXT;
BEGIN
    v_plan_name := new.raw_user_meta_data->>'plan_name';
    v_phone     := new.raw_user_meta_data->>'phone';

    -- Se veio de pagamento (plan_name preenchido), marca como convertido
    IF v_plan_name IS NOT NULL AND v_plan_name != '' THEN
        v_source := 'payment';
        v_status := 'converted';
    ELSE
        v_source := 'organic';
        v_status := 'new';
    END IF;

    INSERT INTO public.crm_leads (user_id, full_name, email, phone, plan_name, source, status)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        new.email,
        v_phone,
        v_plan_name,
        v_source::crm_source_type,
        v_status::crm_lead_status
    )
    ON CONFLICT DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (O trigger já existe — DROP + CREATE garante que usa a versão nova)
DROP TRIGGER IF EXISTS on_auth_user_created_crm ON auth.users;
CREATE TRIGGER on_auth_user_created_crm
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_to_crm();

-- Confirmar
SELECT 'Trigger atualizado com sucesso!' AS resultado;
