-- Add last_seen_at to crm_leads for presence tracking
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Enable Realtime on crm_messages and crm_conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_conversations;

-- Allow leads (via user_id) to read their own conversations and messages
DO $$ BEGIN
    CREATE POLICY "Leads can view own conversations" ON public.crm_conversations
        FOR SELECT USING (
            lead_id IN (
                SELECT id FROM public.crm_leads WHERE user_id = auth.uid()
            )
        );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Leads can view own messages" ON public.crm_messages
        FOR SELECT USING (
            conversation_id IN (
                SELECT c.id FROM public.crm_conversations c
                JOIN public.crm_leads l ON l.id = c.lead_id
                WHERE l.user_id = auth.uid()
            )
        );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Leads can send messages" ON public.crm_messages
        FOR INSERT WITH CHECK (
            direction = 'inbound' AND
            conversation_id IN (
                SELECT c.id FROM public.crm_conversations c
                JOIN public.crm_leads l ON l.id = c.lead_id
                WHERE l.user_id = auth.uid()
            )
        );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Allow leads to update their own last_seen_at
DO $$ BEGIN
    CREATE POLICY "Leads can update own presence" ON public.crm_leads
        FOR UPDATE USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
