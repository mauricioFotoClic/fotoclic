-- Comprehensive fix for sales table schema
-- We enable ALL columns expected by the application

-- 1. commission_rate
ALTER TABLE "public"."sales" 
ADD COLUMN IF NOT EXISTS "commission_rate" numeric DEFAULT 0.15;

-- 2. photographer_id
ALTER TABLE "public"."sales" 
ADD COLUMN IF NOT EXISTS "photographer_id" uuid REFERENCES "public"."users"("id");

-- 3. sale_date (User reported this missing)
ALTER TABLE "public"."sales" 
ADD COLUMN IF NOT EXISTS "sale_date" timestamp with time zone DEFAULT now();

-- 4. Verify price and commission just in case
ALTER TABLE "public"."sales" 
ADD COLUMN IF NOT EXISTS "price" numeric NOT NULL DEFAULT 0;

ALTER TABLE "public"."sales" 
ADD COLUMN IF NOT EXISTS "commission" numeric NOT NULL DEFAULT 0;

-- Update defaults for existing rows to avoid null issues in UI
UPDATE "public"."sales" 
SET "commission_rate" = 0.15 
WHERE "commission_rate" IS NULL;

UPDATE "public"."sales" 
SET "sale_date" = created_at 
WHERE "sale_date" IS NULL AND to_regclass('public.sales') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'created_at');

-- If created_at doesn't exist, set to now
UPDATE "public"."sales" 
SET "sale_date" = now() 
WHERE "sale_date" IS NULL;

-- Reload Supabase Schema Cache
NOTIFY pgrst, 'reload config';
