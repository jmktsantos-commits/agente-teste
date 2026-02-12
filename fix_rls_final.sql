-- SCRIPT FINAL DE CORREÇÃO DE RLS
-- Execute este script no SQL Editor do Supabase

-- 1. Removemos TODAS as variações de nomes possíveis para limpar
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;

-- 2. Recria as políticas LIMPAS e SEM RECURSÃO (Loop Infinito)

-- Leitura: Permitir que TODOS os usuários autenticados leiam perfis básicos
-- (Isso evita recursão de checar se é admin lendo a própria tabela profiles)
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated');

-- Atualização: Apenas o dono pode atualizar seus dados
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Inserção: Apenas o dono pode inserir
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);
