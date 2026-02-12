-- 1. Criar tabela de PREDICTIONS (Análise da IA)
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    platform TEXT NOT NULL,
    prediction_type TEXT NOT NULL,
    confidence NUMERIC(3,2) NOT NULL,
    suggested_range TEXT,
    reason TEXT NOT NULL,
    analysis_data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- 2. Criar tabela de NOTIFICATIONS (Histórico de Alertas/Push)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message TEXT NOT NULL,
    data JSONB
);

-- 3. Habilitar Realtime para ambas
ALTER PUBLICATION supabase_realtime ADD TABLE predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 4. Habilitar RLS (Segurança)
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Acesso (Leitura para todos, Escrita para Service Role)
CREATE POLICY "Leitura pública predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "Leitura pública notifications" ON notifications FOR SELECT USING (true);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_predictions_active ON predictions(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
