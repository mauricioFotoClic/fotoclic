-- Ensure carts table exists with correct schema
CREATE TABLE IF NOT EXISTS "public"."carts" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id" uuid NOT NULL,
    "items" jsonb DEFAULT '[]'::jsonb,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add unique constraint on user_id to allow ON CONFLICT (user_id) DO UPDATE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'carts_user_id_key'
    ) THEN
        ALTER TABLE "public"."carts" ADD CONSTRAINT "carts_user_id_key" UNIQUE ("user_id");
    END IF;
END
$$;

-- Enable RLS
ALTER TABLE "public"."carts" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow read for owner" ON "public"."carts";
DROP POLICY IF EXISTS "Allow insert for authenticated" ON "public"."carts";
DROP POLICY IF EXISTS "Allow update for owner" ON "public"."carts";
DROP POLICY IF EXISTS "Allow delete for owner" ON "public"."carts";
DROP POLICY IF EXISTS "Allow all" ON "public"."carts";

-- Create permissive policy for custom auth
CREATE POLICY "Allow all"
ON "public"."carts"
AS PERMISSIVE
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_carts_updated_at ON "public"."carts";

CREATE TRIGGER update_carts_updated_at
BEFORE UPDATE ON "public"."carts"
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
