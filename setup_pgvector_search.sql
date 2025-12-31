-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 1. Modify the face_encodings table to use vector type and metadata
-- We are recreating or altering to ensure all columns exist
-- WARNING: This deletes existing encoding data if you run the DELETE.
-- WARNING: This deletes existing encoding data if you run the DELETE.
DELETE FROM face_encodings;

-- CRITICAL: Reset the indexed flag on photos so the UI knows they need re-indexing
UPDATE photos SET is_face_indexed = false;

ALTER TABLE face_encodings 
DROP COLUMN IF EXISTS descriptor;

ALTER TABLE face_encodings 
ADD COLUMN descriptor vector(128); -- 128 dimensions for face-api.js SSD MobileNet V1

-- Add metadata columns as per spec
ALTER TABLE face_encodings
ADD COLUMN IF NOT EXISTS x int,
ADD COLUMN IF NOT EXISTS y int,
ADD COLUMN IF NOT EXISTS w int,
ADD COLUMN IF NOT EXISTS h int,
ADD COLUMN IF NOT EXISTS quality_score float DEFAULT 0;

-- 2. Create an index for faster queries (HNSW)
-- DROP existing index to recreate with Cosine ops
DROP INDEX IF EXISTS face_encodings_descriptor_idx;

CREATE INDEX IF NOT EXISTS face_encodings_descriptor_idx 
ON face_encodings 
USING hnsw (descriptor vector_cosine_ops); -- Changed to Cosine Distance

-- 3. Create the matching function using Cosine Distance
-- First drop the old function because we are changing the return type (similarity -> distance)
DROP FUNCTION IF EXISTS match_faces(vector, float, int);

create or replace function match_faces (
  query_embedding vector(128),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  photo_id uuid,
  distance float -- Changed name to distance to reflect spec
)
language plpgsql
as $$
begin
  return query
  select
    face_encodings.id,
    face_encodings.photo_id,
    (face_encodings.descriptor <=> query_embedding) as distance -- using <=> for cosine distance
  from face_encodings
  where (face_encodings.descriptor <=> query_embedding) < match_threshold
  order by face_encodings.descriptor <=> query_embedding
  limit match_count;
end;
$$;
