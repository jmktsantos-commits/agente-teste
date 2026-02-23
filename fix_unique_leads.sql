-- ============================================================
-- LIMPEZA DE EMAIS DUPLICADOS NO BANCO
-- Execute no Supabase -> SQL Editor ANTES do fix_unique_leads.sql
-- ============================================================

-- 1. Cria uma tabela temporária apenas para manter o controle de quais IDs manter
CREATE TEMP TABLE leads_to_keep AS
SELECT id
FROM (
  SELECT 
    id,
    -- Prioridade:
    -- 1. Se tem user_id, ganha.
    -- 2. Dentre os empatados, o mais antigo (created_at) ganha.
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(email) 
      ORDER BY 
        CASE WHEN user_id IS NOT NULL THEN 0 ELSE 1 END,
        created_at ASC
    ) as rnk
  FROM public.crm_leads
  WHERE email IS NOT NULL
) ranked
WHERE rnk = 1;

-- 2. Deleta as conversas associadas aos leads que VÃO SER EXCLUÍDOS
DELETE FROM public.crm_conversations
WHERE lead_id IN (
    SELECT id FROM public.crm_leads 
    WHERE email IS NOT NULL 
    AND id NOT IN (SELECT id FROM leads_to_keep)
);

-- 3. Deleta os leads duplicados que "perderam" na classificação acima
DELETE FROM public.crm_leads
WHERE email IS NOT NULL 
AND id NOT IN (SELECT id FROM leads_to_keep);

-- 4. Agora sim podemos aplicar a trava matemática com 100% de segurança
DROP INDEX IF EXISTS public.crm_leads_email_unique_idx;

CREATE UNIQUE INDEX crm_leads_email_unique_idx 
ON public.crm_leads (LOWER(email)) 
WHERE email IS NOT NULL;

-- 5. Confirmação
SELECT 'Limpeza feita e banco de dados blindado com sucesso!' AS status;
