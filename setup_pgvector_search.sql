-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 1. Modify the face_encodings table to use vector type
-- We need to drop the old column (or alter it if it was empty, but dropping is safer for type change from jsonb)
-- WARNING: This deletes existing encoding data.
DELETE FROM face_encodings;

ALTER TABLE face_encodings 
DROP COLUMN IF EXISTS descriptor;

ALTER TABLE face_encodings 
ADD COLUMN descriptor vector(128); -- 128 dimensions for face-api.js SSD MobileNet V1

-- 2. Create an index for faster queries (HNSW)
CREATE INDEX IF NOT EXISTS face_encodings_descriptor_idx 
ON face_encodings 
USING hnsw (descriptor vector_l2_ops);

-- 3. Create the matching function
create or replace function match_faces (
  query_embedding vector(128),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  photo_id uuid,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    face_encodings.id,
    face_encodings.photo_id,
    (face_encodings.descriptor <-> query_embedding) as similarity -- Actually returning distance here, naming it similarity for TS compatibility or verify typing
  from face_encodings
  where (face_encodings.descriptor <-> query_embedding) < match_threshold
  order by face_encodings.descriptor <-> query_embedding
  limit match_count;
end;
$$;
