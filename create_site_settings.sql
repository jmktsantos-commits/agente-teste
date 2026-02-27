-- ============================================================
-- TABELA DE CONFIGURAÇÕES DO SITE
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Valor padrão: vídeo de boas-vindas vazio
INSERT INTO public.site_settings (key, value)
VALUES ('welcome_video_url', '')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode LER
CREATE POLICY "site_settings_read" ON public.site_settings
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Somente admins podem ESCREVER
CREATE POLICY "site_settings_write_admin" ON public.site_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
