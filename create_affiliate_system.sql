-- ============================================================
-- SISTEMA DE AFILIADOS — Migração Supabase
-- Execute este SQL no editor SQL do Supabase
-- ============================================================

-- 1. Adicionar coluna btag em profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS btag text;

-- 2. Criar tabela de afiliados
CREATE TABLE IF NOT EXISTS public.affiliates (
    id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    btag text UNIQUE NOT NULL,
    commission_rate numeric(5,2) NOT NULL DEFAULT 10.00,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    approved_by uuid REFERENCES public.profiles(id),
    approved_at timestamptz,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Adicionar affiliate_id em crm_leads
ALTER TABLE public.crm_leads
ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.affiliates(id);

-- Índice para busca por afiliado
CREATE INDEX IF NOT EXISTS idx_crm_leads_affiliate_id ON public.crm_leads(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_profiles_btag ON public.profiles(btag);

-- 4. Criar tabela de comissões
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
    lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    amount numeric(10,2) NOT NULL DEFAULT 0,
    description text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    paid_at timestamptz
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON public.affiliate_commissions(affiliate_id);

-- 5. View de stats dos afiliados (facilita queries)
CREATE OR REPLACE VIEW public.affiliate_stats AS
SELECT
    a.id,
    a.btag,
    a.commission_rate,
    a.status,
    a.approved_at,
    a.created_at,
    p.full_name,
    p.email,
    COUNT(DISTINCT l.id) AS total_leads,
    COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN l.id END) AS total_conversions,
    COALESCE(SUM(CASE WHEN c.status != 'cancelled' THEN c.amount ELSE 0 END), 0) AS total_commission
FROM public.affiliates a
LEFT JOIN public.profiles p ON p.id = a.id
LEFT JOIN public.crm_leads l ON l.affiliate_id = a.id
LEFT JOIN public.affiliate_commissions c ON c.affiliate_id = a.id
GROUP BY a.id, a.btag, a.commission_rate, a.status, a.approved_at, a.created_at, p.full_name, p.email;

-- 6. Função para associar lead ao afiliado pelo btag do usuário que os cadastrou
CREATE OR REPLACE FUNCTION public.associate_lead_affiliate()
RETURNS TRIGGER AS $$
DECLARE
    v_btag text;
    v_affiliate_id uuid;
BEGIN
    -- Tenta pegar o btag do user_id associado ao lead (se houver)
    IF NEW.user_id IS NOT NULL THEN
        SELECT profiles.btag INTO v_btag FROM public.profiles WHERE id = NEW.user_id;
        IF v_btag IS NOT NULL THEN
            SELECT affiliates.id INTO v_affiliate_id FROM public.affiliates WHERE btag = v_btag AND status = 'active';
            IF v_affiliate_id IS NOT NULL THEN
                NEW.affiliate_id := v_affiliate_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auto-associar
DROP TRIGGER IF EXISTS trg_associate_lead_affiliate ON public.crm_leads;
CREATE TRIGGER trg_associate_lead_affiliate
    BEFORE INSERT ON public.crm_leads
    FOR EACH ROW EXECUTE FUNCTION public.associate_lead_affiliate();

-- 7. Função para criar comissão automática ao converter lead
CREATE OR REPLACE FUNCTION public.create_commission_on_conversion()
RETURNS TRIGGER AS $$
DECLARE
    v_affiliate affiliates%ROWTYPE;
BEGIN
    -- Só age quando o status muda PARA 'converted'
    IF NEW.status = 'converted' AND (OLD.status IS NULL OR OLD.status != 'converted') THEN
        IF NEW.affiliate_id IS NOT NULL THEN
            SELECT * INTO v_affiliate FROM public.affiliates WHERE id = NEW.affiliate_id;
            IF v_affiliate.id IS NOT NULL THEN
                INSERT INTO public.affiliate_commissions (affiliate_id, lead_id, amount, description, status)
                VALUES (
                    v_affiliate.id,
                    NEW.id,
                    v_affiliate.commission_rate,
                    'Comissão por conversão do lead ID: ' || NEW.id::text,
                    'pending'
                )
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_commission_on_conversion ON public.crm_leads;
CREATE TRIGGER trg_commission_on_conversion
    AFTER UPDATE ON public.crm_leads
    FOR EACH ROW EXECUTE FUNCTION public.create_commission_on_conversion();

-- 8. RLS Policies

-- Habilitar RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas (idempotente)
DROP POLICY IF EXISTS "admin_full_access_affiliates" ON public.affiliates;
DROP POLICY IF EXISTS "affiliate_view_self" ON public.affiliates;
DROP POLICY IF EXISTS "admin_full_access_commissions" ON public.affiliate_commissions;
DROP POLICY IF EXISTS "affiliate_view_own_commissions" ON public.affiliate_commissions;
DROP POLICY IF EXISTS "affiliate_view_own_leads" ON public.crm_leads;

-- Affiliates: admin vê tudo, afiliado vê só a si mesmo
CREATE POLICY "admin_full_access_affiliates" ON public.affiliates
    FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "affiliate_view_self" ON public.affiliates
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Commissions: admin vê tudo, afiliado vê só as suas
CREATE POLICY "admin_full_access_commissions" ON public.affiliate_commissions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "affiliate_view_own_commissions" ON public.affiliate_commissions
    FOR SELECT
    TO authenticated
    USING (affiliate_id = auth.uid());

-- crm_leads: afiliado vê só os seus
CREATE POLICY "affiliate_view_own_leads" ON public.crm_leads
    FOR SELECT
    TO authenticated
    USING (
        affiliate_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.affiliates WHERE id = auth.uid() AND status = 'active')
    );

-- 9. Atualizar o trigger handle_new_user para capturar btag do metadata de cadastro
-- Isso é necessário para que quando o usuário se cadastra via link de afiliado,
-- o btag seja salvo no perfil dele e o lead seja associado automaticamente ao afiliado.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        birth_date,
        btag,
        created_at
    )
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'phone',
        (new.raw_user_meta_data->>'birth_date')::DATE,
        new.raw_user_meta_data->>'btag',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        btag = EXCLUDED.btag;
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO public.profiles (id, email, full_name, btag, created_at)
        VALUES (
            new.id,
            new.email,
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'btag',
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            btag = EXCLUDED.btag;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger (idempotente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
