-- ============================================================
-- FIX COMPLETO: RLS para CRM (Admin + Afiliado)
-- Execute este SQL no Supabase -> SQL Editor
-- Corrige: conversas sumidas no admin, mensagens não salvas de afiliados
-- ============================================================

-- ── crm_leads ────────────────────────────────────────────────────────────────
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_view_own_leads" ON public.crm_leads;
DROP POLICY IF EXISTS "admin_full_access_leads" ON public.crm_leads;
DROP POLICY IF EXISTS "user_own_lead_access" ON public.crm_leads;
DROP POLICY IF EXISTS "authenticated_read_leads" ON public.crm_leads;
DROP POLICY IF EXISTS "admin_select_leads" ON public.crm_leads;

-- Admin: acesso total
CREATE POLICY "admin_full_access_leads" ON public.crm_leads
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Usuário: vê seu próprio lead
CREATE POLICY "user_own_lead_access" ON public.crm_leads
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Afiliado: acesso total aos seus próprios leads (SELECT + INSERT + UPDATE)
CREATE POLICY "affiliate_own_leads" ON public.crm_leads
    FOR ALL TO authenticated
    USING (
        affiliate_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.affiliates WHERE id = auth.uid() AND status = 'active')
    )
    WITH CHECK (
        affiliate_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.affiliates WHERE id = auth.uid() AND status = 'active')
    );

-- ── crm_conversations ─────────────────────────────────────────────────────────
ALTER TABLE public.crm_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access_conversations" ON public.crm_conversations;
DROP POLICY IF EXISTS "admin_select_conversations" ON public.crm_conversations;
DROP POLICY IF EXISTS "affiliate_view_own_conversations" ON public.crm_conversations;
DROP POLICY IF EXISTS "affiliate_own_conversations" ON public.crm_conversations;

-- Admin: acesso total
CREATE POLICY "admin_full_access_conversations" ON public.crm_conversations
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Afiliado: acesso às conversas dos seus leads
CREATE POLICY "affiliate_own_conversations" ON public.crm_conversations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.crm_leads l
            WHERE l.id = crm_conversations.lead_id
              AND l.affiliate_id = auth.uid()
              AND EXISTS (SELECT 1 FROM public.affiliates WHERE id = auth.uid() AND status = 'active')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.crm_leads l
            WHERE l.id = crm_conversations.lead_id
              AND l.affiliate_id = auth.uid()
              AND EXISTS (SELECT 1 FROM public.affiliates WHERE id = auth.uid() AND status = 'active')
        )
    );

-- ── crm_messages ──────────────────────────────────────────────────────────────
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access_messages" ON public.crm_messages;
DROP POLICY IF EXISTS "affiliate_view_own_messages" ON public.crm_messages;
DROP POLICY IF EXISTS "affiliate_own_messages" ON public.crm_messages;

-- Admin: acesso total
CREATE POLICY "admin_full_access_messages" ON public.crm_messages
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Afiliado: acesso às mensagens das conversas dos seus leads (INSERT + SELECT)
CREATE POLICY "affiliate_own_messages" ON public.crm_messages
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.crm_conversations c
            JOIN public.crm_leads l ON l.id = c.lead_id
            WHERE c.id = crm_messages.conversation_id
              AND l.affiliate_id = auth.uid()
              AND EXISTS (SELECT 1 FROM public.affiliates WHERE id = auth.uid() AND status = 'active')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.crm_conversations c
            JOIN public.crm_leads l ON l.id = c.lead_id
            WHERE c.id = crm_messages.conversation_id
              AND l.affiliate_id = auth.uid()
              AND EXISTS (SELECT 1 FROM public.affiliates WHERE id = auth.uid() AND status = 'active')
        )
    );

-- ── Realtime: tabelas já estão na publicação supabase_realtime ───────────────
-- As linhas ALTER PUBLICATION foram removidas pois as tabelas já fazem parte.
-- RLS corrigido com sucesso!

