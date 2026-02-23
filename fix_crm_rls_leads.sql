-- ============================================================
-- FIX: Permite que usuários (leads) vejam as próprias mensagens
-- Necessário para o Realtime entregar mensagens do admin no chat
-- Execute no Supabase -> SQL Editor
-- ============================================================

-- ── crm_conversations: usuário vê sua própria conversa ───────────────────────
DROP POLICY IF EXISTS "user_own_conversations" ON public.crm_conversations;

CREATE POLICY "user_own_conversations" ON public.crm_conversations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.crm_leads l
            WHERE l.id = crm_conversations.lead_id
              AND l.user_id = auth.uid()
        )
    );

-- ── crm_messages: usuário lê mensagens da própria conversa ───────────────────
DROP POLICY IF EXISTS "user_read_own_messages" ON public.crm_messages;

CREATE POLICY "user_read_own_messages" ON public.crm_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.crm_conversations c
            JOIN public.crm_leads l ON l.id = c.lead_id
            WHERE c.id = crm_messages.conversation_id
              AND l.user_id = auth.uid()
        )
    );

-- ── crm_messages: usuário envia mensagem (inbound) na própria conversa ────────
DROP POLICY IF EXISTS "user_insert_own_messages" ON public.crm_messages;

CREATE POLICY "user_insert_own_messages" ON public.crm_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        direction = 'inbound'
        AND EXISTS (
            SELECT 1 FROM public.crm_conversations c
            JOIN public.crm_leads l ON l.id = c.lead_id
            WHERE c.id = crm_messages.conversation_id
              AND l.user_id = auth.uid()
        )
    );

-- Confirma
SELECT 'Políticas RLS para leads adicionadas com sucesso' AS status;
