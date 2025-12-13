-- DROP and RECREATE payouts table to ensure correct schema
DROP TABLE IF EXISTS "public"."payouts" CASCADE;

CREATE TABLE "public"."payouts" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "photographer_id" uuid NOT NULL,
    "amount" numeric NOT NULL,
    "status" text DEFAULT 'pending'::text NOT NULL,
    "request_date" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "scheduled_date" timestamp with time zone,
    "processed_date" timestamp with time zone
);

-- Re-establish Foreign Key to public.users
ALTER TABLE "public"."payouts"
ADD CONSTRAINT "payouts_photographer_id_fkey"
FOREIGN KEY ("photographer_id")
REFERENCES "public"."users" ("id")
ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE "public"."payouts" ENABLE ROW LEVEL SECURITY;

-- Permissive Policy
CREATE POLICY "Allow all"
ON "public"."payouts"
AS PERMISSIVE
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Trigger for default scheduled_date
CREATE OR REPLACE FUNCTION set_payout_scheduled_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.scheduled_date IS NULL THEN
        NEW.scheduled_date = now() + interval '7 days';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_set_payout_scheduled_date
BEFORE INSERT ON "public"."payouts"
FOR EACH ROW
EXECUTE PROCEDURE set_payout_scheduled_date();
