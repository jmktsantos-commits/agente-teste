-- ============================================================
-- FIX DEFINITIVO: Trigger à prova de erros para criação de leads
-- O trigger NUNCA mais vai bloquear a criação de usuários.
-- Execute no Supabase -> SQL Editor
-- ============================================================

-- 1. Garantir que o ENUM tem todos os valores necessários
ALTER TYPE crm_source_type ADD VALUE IF NOT EXISTS 'payment';

-- 2. Garantir que a coluna plan_name existe
ALTER TABLE public.crm_leads
    ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT NULL;

-- 3. Recriar o trigger COM EXCEPTION HANDLER (nunca vai falhar o invite)
CREATE OR REPLACE FUNCTION public.sync_user_to_crm()
RETURNS TRIGGER AS $$
BEGIN
    -- Cria entry básica no CRM (source/status serão atualizados pelo webhook depois)
    INSERT INTO public.crm_leads (user_id, full_name, email, status, source)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'Membro'),
        new.email,
        'new',
        'organic'
    )
    ON CONFLICT DO NOTHING;

    RETURN new;

EXCEPTION WHEN OTHERS THEN
    -- SE qualquer erro acontecer no CRM, IGNORAR e deixar o usuário ser criado normalmente
    -- O webhook vai tentar atualizar o lead depois de forma independente
    RAISE WARNING '[CRM trigger] Erro ignorado ao criar lead para %: %', new.email, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created_crm ON auth.users;
CREATE TRIGGER on_auth_user_created_crm
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_to_crm();

SELECT 'Trigger corrigido! Convites vão funcionar agora.' AS resultado;
