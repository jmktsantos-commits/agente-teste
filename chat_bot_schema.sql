-- Chat Messages and Bot Setup
-- Run this SQL in Supabase SQL Editor

-- 1. Create chat_messages table if not exists
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'system', 'bot')),
    is_bot BOOLEAN DEFAULT FALSE,
   username TEXT,
    visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for chat_messages
-- Allow authenticated users to read visible messages
CREATE POLICY "Authenticated users can read visible messages"
    ON chat_messages
    FOR SELECT
    TO authenticated
    USING (visible = TRUE);

-- Allow authenticated users to insert their own messages
CREATE POLICY "Authenticated users can insert their own messages"
    ON chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow admins to update/delete messages
CREATE POLICY "Admins can update messages"
    ON chat_messages
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Allow system/bots to insert messages (for n8n)
CREATE POLICY "Service role can insert bot messages"
    ON chat_messages
    FOR INSERT
    TO service_role
    WITH CHECK (TRUE);

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at 
    ON chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_visible 
    ON chat_messages(visible) WHERE visible = TRUE;

-- 5. Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_chat_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_messages_updated_at();

-- 6. Insert bot user (if profiles table exists)
-- First check if profiles table has necessary structure
DO $$
BEGIN
    -- Insert bot user only if not exists
    INSERT INTO profiles (id, username, role, avatar_url)
    VALUES (
        '00000000-0000-0000-0000-000000000001'::UUID,
        'Aviator Assistant',
        'bot',
        '/bot-avatar.png'
    )
    ON CONFLICT (id) DO UPDATE 
    SET username = 'Aviator Assistant',
        role = 'bot';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not insert bot user. Profiles table may not exist yet.';
END $$;

-- 7. Insert welcome message from bot
INSERT INTO chat_messages (
    user_id,
    content,
    role,
    is_bot,
    username,
    visible,
    created_at
)
VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    '👋 Olá! Sou o Aviator Assistant. Posso ajudar com sinais, previsões ou dúvidas. Digite "ajuda" para ver comandos disponíveis!',
    'bot',
    TRUE,
    'Aviator Assistant',
    TRUE,
    NOW() - INTERVAL '2 hours'
) ON CONFLICT DO NOTHING;

-- 8. Grant permissions for realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Done! Test with:
-- SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 10;
