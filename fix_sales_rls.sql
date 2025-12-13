-- Drop existing policies that rely on Supabase Auth
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON "public"."sales";
DROP POLICY IF EXISTS "Allow read for buyer" ON "public"."sales";
DROP POLICY IF EXISTS "Allow read for photographer" ON "public"."sales";

-- Create permissive policies (since app manages auth logically, not via Supabase Auth)
-- CAUTION: This allows public access to sales data if the API key is exposed. 
-- In a real production app with Supabase Auth, revert to using auth.uid().

CREATE POLICY "Enable insert for all" ON "public"."sales"
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for all" ON "public"."sales"
FOR SELECT USING (true);

CREATE POLICY "Enable update for all" ON "public"."sales"
FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all" ON "public"."sales"
FOR DELETE USING (true);
