-- =============================================
-- SUPABASE STORAGE: Bucket para mídia do chat
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. Criar bucket público para mídia do chat
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-media',
    'chat-media',
    true,
    52428800, -- 50MB limit
    ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','audio/mpeg','audio/ogg','audio/wav','audio/mp4']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','audio/mpeg','audio/ogg','audio/wav','audio/mp4'];

-- 2. Política: qualquer usuário autenticado pode fazer upload
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

-- 3. Política: qualquer pessoa pode visualizar (bucket público)
CREATE POLICY "Anyone can view chat media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-media');

-- 4. Confirmar
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'chat-media';
