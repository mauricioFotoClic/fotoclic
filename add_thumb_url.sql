-- Add thumb_url column to photos table
ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumb_url TEXT;

-- Update moderation_status check constraint to allow 'draft' if a check exists
-- First, let's drop the check if it exists to be safe and re-add it, 
-- OR just trust that text column allows it if no enum type is used.
-- Looking at previous logs, it seems to be a text column. 
-- Let's just add the column for now.
