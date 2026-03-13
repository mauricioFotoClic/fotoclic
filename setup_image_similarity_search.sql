-- Enable the pgvector extension (should already be enabled, but good to ensure)
create extension if not exists vector schema public;

-- 1. Add column to store image-wide embeddings
ALTER TABLE public.photos
ADD COLUMN IF NOT EXISTS image_descriptor public.vector(512);

-- 2. Create an index for faster queries (HNSW)
CREATE INDEX IF NOT EXISTS photos_image_descriptor_idx 
ON public.photos 
USING hnsw (image_descriptor vector_cosine_ops);

-- 3. Create the matching function
DROP FUNCTION IF EXISTS public.match_images(public.vector, float, int);

create or replace function public.match_images (
  query_embedding public.vector(512),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  distance float
)
language plpgsql
as $$
begin
  return query
  select subquery.id, subquery.distance from (
    select
      public.photos.id,
      (public.photos.image_descriptor <=> query_embedding) as distance
    from public.photos
    where public.photos.image_descriptor is not null
    order by public.photos.image_descriptor <=> query_embedding
    limit match_count
  ) subquery
  where subquery.distance < match_threshold;
end;
$$;
