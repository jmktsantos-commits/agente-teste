-- =============================================
-- CRM COMPLETE SCHEMA (Admin Panel)
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Enums for Status and Types (Idempotent)
DO $$ BEGIN
    CREATE TYPE crm_lead_status AS ENUM ('new', 'contacted', 'interested', 'converted', 'lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE crm_source_type AS ENUM ('organic', 'ads', 'referral', 'manual', 'import');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE crm_channel_type AS ENUM ('whatsapp', 'email', 'site_chat');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE crm_msg_direction AS ENUM ('inbound', 'outbound');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. CRM LEADS (Extends Profiles but allows non-users)
CREATE TABLE IF NOT EXISTS public.crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Link to registered user if exists
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    birth_date DATE,
    status crm_lead_status DEFAULT 'new',
    source crm_source_type DEFAULT 'manual',
    notes TEXT,
    tags TEXT[], -- Array of strings for quick tagging (or use relation table)
    last_contact_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CRM TAGS (Structured tagging)
CREATE TABLE IF NOT EXISTS public.crm_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#94a3b8',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_lead_tags (
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.crm_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (lead_id, tag_id)
);

-- 4. CRM CONVERSATIONS (Group messages by channel)
CREATE TABLE IF NOT EXISTS public.crm_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    channel crm_channel_type NOT NULL,
    external_id TEXT, -- ID in the external system (e.g., WhatsApp JID)
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. CRM MESSAGES (Unified history)
CREATE TABLE IF NOT EXISTS public.crm_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
    direction crm_msg_direction NOT NULL,
    content TEXT,
    content_type TEXT DEFAULT 'text', -- text, image, template, audio
    metadata JSONB DEFAULT '{}', -- Store provider IDs, status (sent, delivered, read)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. RLS POLICIES
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

-- Helper to safely create policy
DO $$ BEGIN
    CREATE POLICY "Admins can view CRM leads" ON public.crm_leads
        FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can manage CRM leads" ON public.crm_leads
        FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Admins manage tags" ON public.crm_tags
        FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Admins manage lead tags" ON public.crm_lead_tags
        FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Admins manage conversations" ON public.crm_conversations
        FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Admins manage messages" ON public.crm_messages
        FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. TRIGGER: Sync new registered users to CRM Leads
CREATE OR REPLACE FUNCTION public.sync_user_to_crm()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.crm_leads (user_id, full_name, email, phone, source, status)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.email,
        new.raw_user_meta_data->>'phone',
        'organic',
        'new'
    )
    ON CONFLICT DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_crm ON auth.users;
CREATE TRIGGER on_auth_user_created_crm
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_to_crm();

-- 8. INDEXES (Safe creation)
CREATE INDEX IF NOT EXISTS idx_crm_leads_email ON public.crm_leads(email);
CREATE INDEX IF NOT EXISTS idx_crm_leads_phone ON public.crm_leads(phone);
CREATE INDEX IF NOT EXISTS idx_crm_conversations_lead ON public.crm_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_messages_conversation ON public.crm_messages(conversation_id);
