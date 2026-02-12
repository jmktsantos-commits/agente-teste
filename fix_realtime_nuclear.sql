-- ⚠️ NUCLEAR FIX FOR REALTIME ⚠️
-- Execute isso linha por linha ou tudo de uma vez no SQL Editor

-- 1. Remove da publicação (para resetar)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS crash_history;

-- 2. Garante que a identidade da réplica esteja completa (para enviar todos os campos)
ALTER TABLE crash_history REPLICA IDENTITY FULL;

-- 3. Adiciona novamente à publicação
ALTER PUBLICATION supabase_realtime ADD TABLE crash_history;

-- 4. Garante permissões públicas (caso RLS esteja bloqueando)
DROP POLICY IF EXISTS "Public Read Crash History" ON crash_history;
CREATE POLICY "Public Read Crash History" ON crash_history FOR SELECT USING (true);

-- 5. Habilita RLS (se não estiver habilitado)
ALTER TABLE crash_history ENABLE ROW LEVEL SECURITY;

-- 6. Concede acesso explícito ao schema public para users anônimos
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.crash_history TO anon;
