-- Enable storage extension if not enabled (usually default)
-- Create buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('photos-original', 'photos-original', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('photos-preview', 'photos-preview', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies for photos-original (PRIVATE)
-- 1. Insert: Authenticated users (Photographers)
CREATE POLICY "Photographers can upload originals"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos-original');

-- 2. Select: Only owner (via path convention user_id/...) OR explicit grant (handled by Signed URL usually bypasses RLS if using service role in RPC, but for direct access we rely on signed URLs which validate token)
-- Actually, Signed URLs work independently of RLS if they are signed by service key, but typically they respect RLS if not.
-- For now, we rely on the bucket being PRIVATE. 
-- The "signed URL" mechanism is the standard way to share private objects.

-- 3. Update/Delete: Owner only
CREATE POLICY "Photographers can update/delete own originals"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'photos-original' AND (storage.foldername(name))[1] = auth.uid()::text);


-- RLS Policies for photos-preview (PUBLIC)
-- 1. Insert: Authenticated users
CREATE POLICY "Photographers can upload previews"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos-preview');

-- 2. Select: Public (Everyone)
CREATE POLICY "Everyone can view previews"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos-preview');

-- 3. Update/Delete: Owner only
CREATE POLICY "Photographers can update/delete own previews"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'photos-preview' AND (storage.foldername(name))[1] = auth.uid()::text);
