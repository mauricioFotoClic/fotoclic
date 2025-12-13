-- Enable RLS (idempotent)
ALTER TABLE "public"."carts" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Allow read for owner" ON "public"."carts";
DROP POLICY IF EXISTS "Allow insert for authenticated" ON "public"."carts";
DROP POLICY IF EXISTS "Allow update for owner" ON "public"."carts";
DROP POLICY IF EXISTS "Allow delete for owner" ON "public"."carts";
DROP POLICY IF EXISTS "Allow all" ON "public"."carts";

-- Create a permissive policy for local development / custom auth
-- This allows any operation on the carts table.
-- WARNING: In a production environment with Supabase Auth, you should scope this to auth.uid() = user_id
CREATE POLICY "Allow all"
ON "public"."carts"
AS PERMISSIVE
FOR ALL
TO public
USING (true)
WITH CHECK (true);
