-- 1. Change the default value for future users
ALTER TABLE public.users ALTER COLUMN photo_limit SET DEFAULT 500;

-- 2. Update existing users who are still on the old default (50) to the new default (500)
-- We only update those with exactly 50 to avoid overriding custom limits set by admin.
UPDATE public.users 
SET photo_limit = 500 
WHERE photo_limit = 50;
