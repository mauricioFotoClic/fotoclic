-- Enable RLS on photos table
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- 1. Allow photographers to view their own photos and public photos (SELECT)
-- (Usually exists, but ensuring coverage)
DROP POLICY IF EXISTS "Photos are viewable by everyone" ON photos;
CREATE POLICY "Photos are viewable by everyone"
ON photos FOR SELECT
USING ( is_public = true OR auth.uid() = photographer_id );

-- 2. Allow photographers to INSERT their own photos
DROP POLICY IF EXISTS "Photographers can upload photos" ON photos;
CREATE POLICY "Photographers can upload photos"
ON photos FOR INSERT
WITH CHECK (auth.uid() = photographer_id);

-- 3. Allow photographers to UPDATE their own photos
-- Critical for the "Edit" feature to work
DROP POLICY IF EXISTS "Photographers can update own photos" ON photos;
CREATE POLICY "Photographers can update own photos"
ON photos FOR UPDATE
USING (auth.uid() = photographer_id)
WITH CHECK (auth.uid() = photographer_id);

-- 4. Allow photographers to DELETE their own photos
DROP POLICY IF EXISTS "Photographers can delete own photos" ON photos;
CREATE POLICY "Photographers can delete own photos"
ON photos FOR DELETE
USING (auth.uid() = photographer_id);

-- Grant permissions to authenticated users
GRANT ALL ON photos TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE photos_id_seq TO authenticated;
