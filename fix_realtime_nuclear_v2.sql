-- ⚠️ FIX CORRIGIDO (SQL) ⚠️
-- 1. Remove da publicação de Realtime.
-- OBS: Se der erro "not found" ou "is not a member", pode IGNORAR e seguir.
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Alternativa mais segura (caso não queira recriar tudo, comente as linhas acima e descomente abaixo):
-- ALTER PUBLICATION supabase_realtime DROP TABLE crash_history;

-- 2. Garante envio de todos os dados (REPLICA FULL)
ALTER TABLE crash_history REPLICA IDENTITY FULL;

-- 3. Adiciona novamente na publicação (caso tenha usado a opção de remover tabela individual)
-- ALTER PUBLICATION supabase_realtime ADD TABLE crash_history;

-- 4. Garante permissões públicas de leitura
DROP POLICY IF EXISTS "Public Read Crash History" ON crash_history;
CREATE POLICY "Public Read Crash History" ON crash_history FOR SELECT USING (true);

-- 5. Habilita RLS
ALTER TABLE crash_history ENABLE ROW LEVEL SECURITY;

-- 6. Concede acesso explícito
GRANT SELECT ON crash_history TO anon;
