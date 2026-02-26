-- =============================================
-- FREE TRIAL SCHEMA
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. Adicionar campos de trial e plano na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free'
    CHECK (plan IN ('free', 'trial', 'pro', 'vip')),
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_activated_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_activated_by TEXT DEFAULT NULL, -- 'auto', 'admin', 'partner'
  ADD COLUMN IF NOT EXISTS partner_ref TEXT DEFAULT NULL;         -- código do parceiro de origem

-- 2. Tabela para rastrear notificações de trial enviadas
CREATE TABLE IF NOT EXISTS public.trial_notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type TEXT NOT NULL
    CHECK (notification_type IN ('half_way', 'one_hour_left', 'expired', '48h_follow_up', '72h_follow_up')),
  sent_at          TIMESTAMPTZ DEFAULT NOW(),
  channel          TEXT DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'both')),
  status           TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped'))
);

-- 3. Tabela de parceiros (rastrear referências e conversões)
CREATE TABLE IF NOT EXISTS public.trial_partners (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT UNIQUE NOT NULL,   -- ex: 'SUPERBET', 'BET365'
  name              TEXT NOT NULL,
  trials_generated  INTEGER DEFAULT 0,
  conversions       INTEGER DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS para as novas tabelas
ALTER TABLE public.trial_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_partners ENABLE ROW LEVEL SECURITY;

-- Apenas admins veem notificações de trial
DO $$ BEGIN
  CREATE POLICY "Admins can manage trial notifications"
    ON public.trial_notifications FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Apenas admins gerenciam parceiros
DO $$ BEGIN
  CREATE POLICY "Admins can manage trial partners"
    ON public.trial_partners FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. Indexes para performance
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expires ON public.profiles(trial_expires_at);
CREATE INDEX IF NOT EXISTS idx_trial_notifications_user ON public.trial_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_notifications_type ON public.trial_notifications(notification_type, sent_at);

-- 6. Função para ativar trial de um usuário
CREATE OR REPLACE FUNCTION public.activate_trial(
  p_user_id UUID,
  p_partner_ref TEXT DEFAULT NULL,
  p_activated_by TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Não reativar se já tem plano pago
  IF v_profile.plan IN ('pro', 'vip') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário já possui plano ativo');
  END IF;

  -- Não reativar trial se ainda está ativo
  IF v_profile.plan = 'trial' AND v_profile.trial_expires_at > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trial já está ativo', 'expires_at', v_profile.trial_expires_at);
  END IF;

  v_expires_at := NOW() + INTERVAL '1 day';

  UPDATE public.profiles
  SET
    plan               = 'trial',
    trial_expires_at   = v_expires_at,
    trial_activated_at = NOW(),
    trial_activated_by = p_activated_by,
    partner_ref        = COALESCE(p_partner_ref, partner_ref)
  WHERE id = p_user_id;

  -- Incrementar contador do parceiro se informado
  IF p_partner_ref IS NOT NULL THEN
    UPDATE public.trial_partners
    SET trials_generated = trials_generated + 1
    WHERE code = p_partner_ref;
  END IF;

  -- Atualizar tag no CRM se lead existir
  UPDATE public.crm_leads
  SET
    tags = array_append(COALESCE(tags, '{}'), 'trial_user'),
    status = 'contacted'
  WHERE user_id = p_user_id AND NOT ('trial_user' = ANY(COALESCE(tags, '{}')));

  RETURN jsonb_build_object(
    'success', true,
    'expires_at', v_expires_at,
    'hours', 24
  );
END;
$$;

-- 7. Inserir parceiros de exemplo (ajuste conforme necessário)
INSERT INTO public.trial_partners (code, name) VALUES
  ('SUPERBET', 'Superbet'),
  ('BET365', 'Bet365'),
  ('BETANO', 'Betano'),
  ('ESTRELABET', 'EstrelaBet'),
  ('GENERIC', 'Link Genérico')
ON CONFLICT (code) DO NOTHING;
