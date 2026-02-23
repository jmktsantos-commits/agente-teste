-- ============================================
-- CHAT BOT MIGRATION SQL
-- Adds bot support to existing chat_messages
-- ============================================

-- Step 1: Add is_bot column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' AND column_name = 'is_bot'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN is_bot BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Step 2: Add role column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' AND column_name = 'role'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

-- Step 3: Update role constraint
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_role_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_role_check 
    CHECK (role IN ('user', 'admin', 'system', 'bot'));

-- Step 4: Add username column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' AND column_name = 'username'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN username TEXT;
    END IF;
END $$;

-- Step 5: Make user_id nullable (critical for bot messages)
ALTER TABLE chat_messages ALTER COLUMN user_id DROP NOT NULL;

-- Step 6: RLS policy for bot messages
DROP POLICY IF EXISTS "Service role can insert bot messages" ON chat_messages;
CREATE POLICY "Service role can insert bot messages"
    ON chat_messages FOR INSERT TO service_role WITH CHECK (TRUE);

-- Step 7: Insert bot welcome message
INSERT INTO chat_messages (
    user_id, content, role, is_bot, username, visible, created_at
)
SELECT 
    NULL,
    '👋 Olá! Sou o Aviator Assistant. Posso ajudar com sinais, previsões ou dúvidas. Digite "ajuda" para ver comandos disponíveis!',
    'bot',
    TRUE,
    'Aviator Assistant',
    TRUE,
    NOW() - INTERVAL '2 hours'
WHERE NOT EXISTS (
    SELECT 1 FROM chat_messages WHERE role = 'bot' AND username = 'Aviator Assistant'
);

-- DONE! The realtime is already enabled for all tables in your Supabase.
-- Verify the bot message was inserted:
-- SELECT * FROM chat_messages WHERE is_bot = TRUE ORDER BY created_at DESC;
