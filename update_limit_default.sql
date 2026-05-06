-- 1. Change the default value for future users to a very high value (effectively unlimited)
ALTER TABLE public.users ALTER COLUMN photo_limit SET DEFAULT 1000000;

-- 2. Update existing users to the new high limit
UPDATE public.users 
SET photo_limit = 1000000 
WHERE photo_limit <= 500;
