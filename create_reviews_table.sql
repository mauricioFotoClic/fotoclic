-- Create reviews table
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  photographer_id uuid references public.users(id) on delete cascade not null,
  reviewer_id uuid references public.users(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.reviews enable row level security;

-- Policy: Everyone can read reviews
create policy "Reviews are viewable by everyone" 
on public.reviews for select 
using ( true );

-- Policy: Authenticated users can create reviews
create policy "Authenticated users can create reviews" 
on public.reviews for insert 
with check ( auth.uid() = reviewer_id );

-- Policy: Users can update their own reviews
create policy "Users can update own reviews" 
on public.reviews for update 
using ( auth.uid() = reviewer_id );

-- Policy: Users can delete their own reviews
create policy "Users can delete own reviews" 
on public.reviews for delete 
using ( auth.uid() = reviewer_id );

-- Index for performance
create index if not exists reviews_photographer_id_idx on public.reviews(photographer_id);
