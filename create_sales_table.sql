CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "photo_id" uuid REFERENCES "public"."photos"("id"),
    "buyer_id" uuid REFERENCES "public"."users"("id"),
    "sale_date" timestamp with time zone DEFAULT now(),
    "price" numeric NOT NULL,
    "commission" numeric NOT NULL, -- The platform fee value
    "photographer_id" uuid REFERENCES "public"."users"("id"), -- Copied for easier querying
    "commission_rate" numeric NOT NULL -- Stored for audit purposes
);

-- RLS Policies
ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;

-- Allow insert for authenticated users (buyers)
CREATE POLICY "Allow insert for authenticated users" ON "public"."sales"
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow read for the buyer
CREATE POLICY "Allow read for buyer" ON "public"."sales"
FOR SELECT USING (auth.uid() = buyer_id);

-- Allow read for the photographer (seller)
CREATE POLICY "Allow read for photographer" ON "public"."sales"
FOR SELECT USING (auth.uid() = photographer_id);

-- Allow read for admins (if using specific role check, otherwise disabled or use service role)
-- CREATE POLICY "Allow read for admins" ...
