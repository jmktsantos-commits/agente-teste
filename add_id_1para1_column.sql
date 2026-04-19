-- ============================================================
-- ADICIONAR COLUNA id_1para1 NA TABELA PROFILES
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar a coluna (se não existir)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS id_1para1 TEXT;

-- 2. Confirmar que foi adicionada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'id_1para1';

-- 3. Ver usuários com o ID preenchido
SELECT id, email, full_name, id_1para1, status, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 20;
