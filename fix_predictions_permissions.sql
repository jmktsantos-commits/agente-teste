-- ⚠️ FIX FINAL: PERMISSÃO DE CRIAR PREVISÕES ⚠️

-- 1. Permite que o site (anon) CRIE novas linhas na tabela predictions
GRANT INSERT ON predictions TO anon;

-- 2. Atualiza a política de segurança (RLS) para permitir INSERT
DROP POLICY IF EXISTS "Anon can insert predictions" ON predictions;
CREATE POLICY "Anon can insert predictions" ON predictions FOR INSERT WITH CHECK (true);

-- 3. (Opcional, mas recomendado) Garante que a sequência do ID esteja ok
-- (Como usamos UUID, isso não é estritamente necessário, mas mal não faz)
