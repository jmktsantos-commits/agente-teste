-- Tabela de Previsões de Velas Altas
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    platform TEXT NOT NULL CHECK (platform IN ('bravobet', 'superbet')),
    prediction_type TEXT NOT NULL CHECK (prediction_type IN ('WAIT_HIGH', 'NORMAL', 'CAUTION')),
    confidence NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    suggested_range TEXT,
    reason TEXT NOT NULL,
    analysis_data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_predictions_active ON predictions(is_active, created_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_predictions_platform ON predictions(platform, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_expires ON predictions(expires_at) WHERE is_active = true;

-- Função para invalidar previsões expiradas automaticamente
CREATE OR REPLACE FUNCTION invalidate_expired_predictions()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE predictions
    SET is_active = false
    WHERE expires_at < NOW() AND is_active = true;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para executar a função ao inserir nova previsão
CREATE TRIGGER trigger_invalidate_expired
    AFTER INSERT ON predictions
    FOR EACH ROW
    EXECUTE FUNCTION invalidate_expired_predictions();

-- Comentários
COMMENT ON TABLE predictions IS 'Previsões de velas altas geradas por análise de padrões';
COMMENT ON COLUMN predictions.prediction_type IS 'WAIT_HIGH: Aguardar vela alta | NORMAL: Padrão normal | CAUTION: Evitar apostas';
COMMENT ON COLUMN predictions.confidence IS 'Confiança da previsão (0.00 a 1.00)';
COMMENT ON COLUMN predictions.suggested_range IS 'Exemplo: "3.5x - 8x"';
COMMENT ON COLUMN predictions.analysis_data IS 'Dados brutos da análise (low_streak, minutes_since_high, distribution, etc)';
