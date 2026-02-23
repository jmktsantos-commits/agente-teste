-- Chat Bot Migration - Add is_bot column to existing table
-- Run this SQL in Supabase SQL Editor

-- 1. Add is_bot column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'is_bot'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN is_bot BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Add role column if it doesn't exist (in case it's missing)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

-- 3. Update role column constraint to include 'bot'
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_role_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_role_check 
    CHECK (role IN ('user', 'admin', 'system', 'bot'));

-- 4. Add username column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'username'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN username TEXT;
    END IF;
END $$;

-- 5. Make user_id nullable (allows bot messages without FK issues)
ALTER TABLE chat_messages ALTER COLUMN user_id DROP NOT NULL;

-- 6. Create/Update RLS policy for bot messages
DROP POLICY IF EXISTS "Service role can insert bot messages" ON chat_messages;
CREATE POLICY "Service role can insert bot messages"
    ON chat_messages
    FOR INSERT
    TO service_role
    WITH CHECK (TRUE);

-- 7. Insert bot user in profiles (if table exists)
DO $$
BEGIN
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
    WHEN undefined_table THEN
        RAISE NOTICE 'Profiles table does not exist yet. Skipping bot user creation.';
    WHEN others THEN
        RAISE NOTICE 'Could not insert bot user: %', SQLERRM;
END $$;

-- 8. Insert welcome message from bot (using NULL user_id to avoid FK constraint)
INSERT INTO chat_messages (
    user_id,
    content,
    role,
    is_bot,
    username,
    visible,
    created_at
)
SELECT 
    NULL::UUID,  -- Use NULL instead of fake UUID to avoid FK constraint
    '👋 Olá! Sou o Aviator Assistant. Posso ajudar com sinais, previsões ou dúvidas. Digite "ajuda" para ver comandos disponíveis!',
    'bot',
    TRUE,
    'Aviator Assistant',
    TRUE,
    NOW() - INTERVAL '2 hours'
WHERE NOT EXISTS (
    SELECT 1 FROM chat_messages 
    WHERE role = 'bot'
    AND username = 'Aviator Assistant'
    LIMIT 1
);

-- 9. Enable realtime for chat_messages (if not already enabled)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'chat_messages already in realtime publication';
    WHEN undefined_object THEN
        RAISE NOTICE 'supabase_realtime publication does not exist';
END $$;

-- Done! Verify with:
-- SELECT * FROM chat_messages WHERE is_bot = TRUE ORDER BY created_at DESC LIMIT 5;
