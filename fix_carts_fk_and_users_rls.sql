-- 1. FIX CARTS FOREIGN KEY
-- We need to ensure the cart points to our custom 'public.users' table, not 'auth.users'

-- Drop the existing constraint (whatever it points to)
ALTER TABLE "public"."carts" DROP CONSTRAINT IF EXISTS "carts_user_id_fkey";

-- Add the correct constraint pointing to public.users
ALTER TABLE "public"."carts"
ADD CONSTRAINT "carts_user_id_fkey"
FOREIGN KEY ("user_id")
REFERENCES "public"."users" ("id")
ON DELETE CASCADE;


-- 2. FIX USERS TABLE PERMISSIONS (RLS)
-- The 406 error on GET /users means the API cannot read the user data

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON "public"."users";
DROP POLICY IF EXISTS "Users can insert their own profile" ON "public"."users";
DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."users";
DROP POLICY IF EXISTS "Allow all" ON "public"."users";

-- Create a permissive policy for this custom-auth application
CREATE POLICY "Allow all"
ON "public"."users"
AS PERMISSIVE
FOR ALL
TO public
USING (true)
WITH CHECK (true);
