-- Force defaults on payout columns (fix for existing table)
ALTER TABLE "public"."payouts" 
    ALTER COLUMN "status" SET DEFAULT 'pending',
    ALTER COLUMN "status" SET NOT NULL,
    ALTER COLUMN "request_date" SET DEFAULT timezone('utc'::text, now()),
    ALTER COLUMN "request_date" SET NOT NULL;

-- Fix existing bad data (NULL dates)
UPDATE "public"."payouts"
SET "request_date" = timezone('utc'::text, now())
WHERE "request_date" IS NULL;

UPDATE "public"."payouts"
SET "scheduled_date" = timezone('utc'::text, now() + interval '7 days')
WHERE "scheduled_date" IS NULL;

-- Ensure Trigger exists (re-run safely)
CREATE OR REPLACE FUNCTION set_payout_scheduled_date()
RETURNS TRIGGER AS $$
BEGIN
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
