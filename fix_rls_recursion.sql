-- CORREÇÃO DE ERRO DE RECURSÃO INFINITA (42P17)
-- Execute este script no SQL Editor do Supabase

-- 1. Primeiro, removemos as políticas problemáticas que causam loop
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;

-- Habilita RLS (garantindo que esteja ligado)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Política BÁSICA e SEGURA (Sem recursão)
-- Todo usuário pode ver seu próprio perfil
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Todo usuário pode atualizar seu próprio perfil
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 3. Para permitir que ADMINS vejam tudo, precisamos evitar consultar a tabela 'profiles' dentro da política da tabela 'profiles'
-- A solução mais robusta é criar uma View ou Função segura, mas para simplificar e resolver AGORA:
-- Vamos permitir que qualquer usuário autenticado leia profiles BÁSICOS (necessário para o sistema funcionar)
-- OU, se quisermos ser estritos, usamos uma técnica de "bypass" mas isso é complexo.

-- SOLUÇÃO PRAGMÁTICA: 
-- Permitir leitura pública de perfis (já que são dados básicos como nome/avatar).
-- Isso resolve a recursão pois não precisa checar "se sou admin".
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- 4. Para operações de ESCRITA/DELEÇÃO (Update/Delete), aí sim restringimos.
-- Mas para evitar recursão, vamos confiar que apenas o Painel Admin (que usa Service Role no backend) fará essas operações em massa.
-- Pelo frontend, o usuário só edita o dele.

-- Se quisermos que admin edite outros pelo frontend, aí precisaríamos de uma claim no JWT ou function.
-- Mas como implementamos Server Actions com Service Role (`supabaseAdmin`), 
-- as ações críticas de admin (banir, promover) já ignoram RLS!
-- Então NÃO precisamos de políticas complexas de admin aqui para o front funcionar.

-- Resumo: O front do admin só precisa LER os dados. 
-- E as Server Actions fazem a escrita com poder total.

-- Então a política de leitura pública "Profiles are viewable by everyone" JÁ RESOLVE o problema do Dashboard carregar.
-- E as Server Actions resolvem o problema de banir/promover.
