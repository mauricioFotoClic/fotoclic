-- Relax policies for system_settings since we are using Custom Auth
DROP POLICY IF EXISTS "Allow read access for all users" ON "public"."system_settings";
DROP POLICY IF EXISTS "Allow update for authenticated users" ON "public"."system_settings";
DROP POLICY IF EXISTS "Allow all for authenticated users" ON "public"."system_settings";

CREATE POLICY "Enable read for all" ON "public"."system_settings"
FOR SELECT USING (true);

-- Optional: Allow update for all if you want admin settings to work without Supabase Auth
CREATE POLICY "Enable update for all" ON "public"."system_settings"
FOR UPDATE USING (true);
