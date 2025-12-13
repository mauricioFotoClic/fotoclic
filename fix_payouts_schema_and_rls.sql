-- Ensure payouts table exists with correct schema
CREATE TABLE IF NOT EXISTS "public"."payouts" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "photographer_id" uuid NOT NULL,
    "amount" numeric NOT NULL,
    "status" text DEFAULT 'pending'::text NOT NULL,
    "request_date" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "scheduled_date" timestamp with time zone,
    "processed_date" timestamp with time zone
);

-- Fix Foreign Key to point to PUBLIC.users (not auth.users)
ALTER TABLE "public"."payouts" DROP CONSTRAINT IF EXISTS "payouts_photographer_id_fkey";

ALTER TABLE "public"."payouts"
ADD CONSTRAINT "payouts_photographer_id_fkey"
FOREIGN KEY ("photographer_id")
REFERENCES "public"."users" ("id")
ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE "public"."payouts" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow read for owner" ON "public"."payouts";
DROP POLICY IF EXISTS "Allow insert for owner" ON "public"."payouts";
DROP POLICY IF EXISTS "Allow all" ON "public"."payouts";

-- Create permissive policy for custom auth
CREATE POLICY "Allow all"
ON "public"."payouts"
AS PERMISSIVE
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Ensure scheduled_date is set on insert (simple trigger or default)
CREATE OR REPLACE FUNCTION set_payout_scheduled_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Schedule for next Tuesday if not provided? Or just 7 days from now as default logic?
    -- Let's stick to simple: if null, set to +7 days
    IF NEW.scheduled_date IS NULL THEN
        NEW.scheduled_date = now() + interval '7 days';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_set_payout_scheduled_date ON "public"."payouts";

CREATE TRIGGER trigger_set_payout_scheduled_date
BEFORE INSERT ON "public"."payouts"
FOR EACH ROW
EXECUTE PROCEDURE set_payout_scheduled_date();
