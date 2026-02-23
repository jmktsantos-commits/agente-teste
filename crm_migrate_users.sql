-- =============================================
-- MIGRATE EXISTING AUTH USERS TO CRM LEADS
-- Run this in Supabase SQL Editor
-- =============================================

-- Insert all existing auth.users that don't already have a crm_leads entry
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

-- Show how many were migrated
SELECT COUNT(*) AS total_migrated FROM public.crm_leads WHERE user_id IS NOT NULL;

-- =============================================
-- ADD TYPING INDICATOR SUPPORT
-- Adds a crm_typing table for realtime presence
-- =============================================

-- Add is_typing column to crm_conversations for simple typing state
-- (We'll use Supabase Realtime Broadcast instead - no DB column needed)

-- Ensure last_seen_at column exists (from previous migration)
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- =============================================
-- ENABLE REALTIME (if not already done)
-- =============================================
DO $$
BEGIN
    -- Add tables to realtime publication if not already added
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_conversations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- =============================================
-- RLS POLICIES FOR LEADS (idempotent)
-- =============================================
DO $$ BEGIN
    CREATE POLICY "Leads can view own conversations" ON public.crm_conversations
        FOR SELECT USING (
            lead_id IN (SELECT id FROM public.crm_leads WHERE user_id = auth.uid())
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

DO $$ BEGIN
    CREATE POLICY "Leads can update own presence" ON public.crm_leads
        FOR UPDATE USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Final check
SELECT 
    COUNT(*) as total_leads,
    COUNT(user_id) as leads_with_account,
    COUNT(*) - COUNT(user_id) as leads_without_account
FROM public.crm_leads;
