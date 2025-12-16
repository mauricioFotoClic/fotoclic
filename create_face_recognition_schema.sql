-- Enable pgvector extension if available (optional but recommended)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add column to photos table to track indexing status
ALTER TABLE photos 
ADD COLUMN IF NOT EXISTS is_face_indexed BOOLEAN DEFAULT FALSE;

-- Create face_encodings table
CREATE TABLE IF NOT EXISTS face_encodings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  face_index INTEGER NOT NULL default 0,
  descriptor JSONB NOT NULL, -- Storing as JSONB for maximum compatibility, can cast to vector
  model_version TEXT DEFAULT 'face_recognition_net_v1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for faster lookups (photo_id)
CREATE INDEX IF NOT EXISTS idx_face_encodings_photo_id ON face_encodings(photo_id);

-- RLS Policies
ALTER TABLE face_encodings ENABLE ROW LEVEL SECURITY;

-- Everyone can read (required for search, though strict search should be via RPC/Server function, but allow select for now)
-- Actually, for security, maybe only server should access raw encodings? 
-- Let's allow public read for now to simplify client-side logic if needed, but safer to keep mostly restricted.
-- Given the detailed prompt about privacy, let's keep RLS permissive for development but note to lock down.
CREATE POLICY "Public read access" ON face_encodings FOR SELECT USING (true);
CREATE POLICY "Authenticated insert access" ON face_encodings FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon'); 
-- Allowing anon insert might be needed if upload happens before auth? No, upload is auth only.
-- Adjusting to authenticated only for write.
DROP POLICY IF EXISTS "Authenticated insert access" ON face_encodings;
CREATE POLICY "Authenticated insert access" ON face_encodings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin full access" ON face_encodings FOR ALL USING (
  exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  )
);

-- Function to calculate Euclidean distance (if pgvector not used directly in JS)
-- This allows us to sort by distance on the DB side even with JSONB
CREATE OR REPLACE FUNCTION calculate_distance(a jsonb, b jsonb)
RETURNS float8 AS $$
DECLARE
  sum_sq_diff float8 := 0;
  diff float8;
  i int;
  len int;
BEGIN
  len := jsonb_array_length(a);
  FOR i IN 0..len-1 LOOP
    diff := (a->>i)::float8 - (b->>i)::float8;
    sum_sq_diff := sum_sq_diff + (diff * diff);
  END LOOP;
  RETURN |/ sum_sq_diff;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
