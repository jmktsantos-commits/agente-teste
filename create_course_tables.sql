-- =============================================
-- MINI CURSO SCHEMA — Execute no Supabase SQL Editor
-- =============================================

-- 1. Tabela de módulos do curso
CREATE TABLE IF NOT EXISTS public.course_modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de aulas (lessons) dentro dos módulos
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  video_url   TEXT DEFAULT NULL,
  duration    TEXT DEFAULT NULL,  -- ex: "12:30"
  position    INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de progresso dos membros
CREATE TABLE IF NOT EXISTS public.course_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id   UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON public.course_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_user ON public.course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_lesson ON public.course_progress(lesson_id);

-- 5. RLS
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- Admins têm acesso total
DO $$ BEGIN
  CREATE POLICY "Admins full access on modules"
    ON public.course_modules FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins full access on lessons"
    ON public.course_lessons FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Membros autenticados leem somente módulos e aulas publicados
DO $$ BEGIN
  CREATE POLICY "Members read published modules"
    ON public.course_modules FOR SELECT
    USING (auth.uid() IS NOT NULL AND is_published = TRUE);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Members read published lessons"
    ON public.course_lessons FOR SELECT
    USING (auth.uid() IS NOT NULL AND is_published = TRUE);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Membros gerenciam apenas o próprio progresso
DO $$ BEGIN
  CREATE POLICY "Members manage own progress"
    ON public.course_progress FOR ALL
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 6. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_course_modules_updated_at
  BEFORE UPDATE ON public.course_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER trg_course_lessons_updated_at
  BEFORE UPDATE ON public.course_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
