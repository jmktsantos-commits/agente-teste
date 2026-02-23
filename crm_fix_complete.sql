-- =============================================
-- CORREÇÃO COMPLETA DO CRM CHAT + PRESENÇA
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. Verificar usuários sem crm_leads
SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data->>'full_name' as name,
    l.id as lead_id,
    l.last_seen_at
FROM auth.users u
LEFT JOIN public.crm_leads l ON l.user_id = u.id
ORDER BY u.created_at DESC;

-- 2. Migrar usuários que ainda não têm crm_leads
INSERT INTO public.crm_leads (user_id, full_name, email, phone, source, status, created_at)
SELECT
    u.id,
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        split_part(u.email, '@', 1)
    ) AS full_name,
    u.email,
    u.raw_user_meta_data->>'phone',
    'organic'::crm_source_type,
    'new'::crm_lead_status,
    u.created_at
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.crm_leads l WHERE l.user_id = u.id
)
AND u.email IS NOT NULL;

-- 3. Garantir que last_seen_at existe
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- 4. Habilitar Realtime em TODAS as tabelas necessárias
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_conversations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    -- IMPORTANTE: crm_leads precisa de Realtime para o status online funcionar ao vivo
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_leads;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 5. REMOVER políticas antigas que podem estar conflitando
DROP POLICY IF EXISTS "Leads can view own conversations" ON public.crm_conversations;
DROP POLICY IF EXISTS "Leads can view own messages" ON public.crm_messages;
DROP POLICY IF EXISTS "Leads can send messages" ON public.crm_messages;
DROP POLICY IF EXISTS "Leads can update own presence" ON public.crm_leads;
DROP POLICY IF EXISTS "Leads can insert own conversations" ON public.crm_conversations;

-- 6. Recriar políticas corretamente
CREATE POLICY "Leads can view own conversations" ON public.crm_conversations
    FOR SELECT USING (
        lead_id IN (SELECT id FROM public.crm_leads WHERE user_id = auth.uid())
    );

CREATE POLICY "Leads can insert own conversations" ON public.crm_conversations
    FOR INSERT WITH CHECK (
        lead_id IN (SELECT id FROM public.crm_leads WHERE user_id = auth.uid())
    );

CREATE POLICY "Leads can view own messages" ON public.crm_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT c.id FROM public.crm_conversations c
            JOIN public.crm_leads l ON l.id = c.lead_id
            WHERE l.user_id = auth.uid()
        )
    );

CREATE POLICY "Leads can send messages" ON public.crm_messages
    FOR INSERT WITH CHECK (
        direction = 'inbound' AND
        conversation_id IN (
            SELECT c.id FROM public.crm_conversations c
            JOIN public.crm_leads l ON l.id = c.lead_id
            WHERE l.user_id = auth.uid()
        )
    );

CREATE POLICY "Leads can update own presence" ON public.crm_leads
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 7. Resultado final
SELECT 
    COUNT(*) as total_leads,
    COUNT(user_id) as com_conta,
    COUNT(last_seen_at) as com_presenca,
    COUNT(*) - COUNT(user_id) as sem_conta
FROM public.crm_leads;
