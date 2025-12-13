-- Ensure system_settings table exists with correct schema
CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" integer NOT NULL PRIMARY KEY,
    "commission_default_rate" numeric DEFAULT 0.15,
    "commission_custom_rates" jsonb DEFAULT '{}'::jsonb,
    "email_templates" jsonb,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default row if not exists (ID 1)
INSERT INTO "public"."system_settings" ("id", "commission_default_rate", "commission_custom_rates", "email_templates")
VALUES (
    1, 
    0.15, 
    '{}'::jsonb,
    jsonb_build_object(
        'photographerActivated', jsonb_build_object('subject', 'Sua conta foi ativada!', 'body', 'Olá {{nome_fotografo}}, sua conta foi ativada.'),
        'photographerDeactivated', jsonb_build_object('subject', 'Sua conta foi desativada', 'body', 'Olá {{nome_fotografo}}, sua conta foi desativada.'),
        'photoRejected', jsonb_build_object('subject', 'Foto rejeitada', 'body', 'Olá {{nome_fotografo}}, sua foto {{titulo_foto}} foi rejeitada. Motivo: {{motivo_rejeicao}}'),
        'payoutProcessed', jsonb_build_object('subject', 'Pagamento processado', 'body', 'Olá {{nome_fotografo}}, seu pagamento de {{valor_pagamento}} foi processado em {{data_pagamento}}.')
    )
)
ON CONFLICT ("id") DO NOTHING;

-- Enable RLS
ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow read for all" ON "public"."system_settings";
DROP POLICY IF EXISTS "Allow update for admin" ON "public"."system_settings";
DROP POLICY IF EXISTS "Allow all" ON "public"."system_settings";

-- Create permissive policy for custom auth
CREATE POLICY "Allow all"
ON "public"."system_settings"
AS PERMISSIVE
FOR ALL
TO public
USING (true)
WITH CHECK (true);
