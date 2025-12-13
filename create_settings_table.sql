-- Create a table to store system settings (commission, email templates, etc.)
CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" integer PRIMARY KEY DEFAULT 1,
    "commission_default_rate" numeric DEFAULT 0.15,
    "commission_custom_rates" jsonb DEFAULT '{}'::jsonb,
    "email_templates" jsonb DEFAULT '{
        "photographerActivated": {"subject": "Sua conta foi ativada!", "body": "Olá {{nome_fotografo}}, sua conta foi ativada."},
        "photographerDeactivated": {"subject": "Sua conta foi desativada", "body": "Olá {{nome_fotografo}}, sua conta foi desativada."},
        "photoRejected": {"subject": "Foto rejeitada", "body": "Olá {{nome_fotografo}}, sua foto {{titulo_foto}} foi rejeitada. Motivo: {{motivo_rejeicao}}"},
        "payoutProcessed": {"subject": "Pagamento processado", "body": "Olá {{nome_fotografo}}, seu pagamento de {{valor_pagamento}} foi processado em {{data_pagamento}}."}
    }'::jsonb,
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "single_row_check" CHECK (id = 1)
);

-- Insert the initial row if it doesn't exist
INSERT INTO "public"."system_settings" ("id", "commission_default_rate", "commission_custom_rates", "email_templates")
VALUES (1, 0.15, '{}'::jsonb, '{
    "photographerActivated": {"subject": "Sua conta foi ativada!", "body": "Olá {{nome_fotografo}}, sua conta foi ativada."},
    "photographerDeactivated": {"subject": "Sua conta foi desativada", "body": "Olá {{nome_fotografo}}, sua conta foi desativada."},
    "photoRejected": {"subject": "Foto rejeitada", "body": "Olá {{nome_fotografo}}, sua foto {{titulo_foto}} foi rejeitada. Motivo: {{motivo_rejeicao}}"},
    "payoutProcessed": {"subject": "Pagamento processado", "body": "Olá {{nome_fotografo}}, seu pagamento de {{valor_pagamento}} foi processado em {{data_pagamento}}."}
}'::jsonb)
ON CONFLICT ("id") DO NOTHING;

-- Enable RLS (optional, but good practice)
ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (or just authenticated users)
-- Allow read access to everyone (or just authenticated users)
DROP POLICY IF EXISTS "Allow read access for all users" ON "public"."system_settings";
CREATE POLICY "Allow read access for all users" ON "public"."system_settings"
FOR SELECT USING (true);

-- Allow update access only to admins (you might need to adjust this based on your auth setup)
-- For now, allowing update for authenticated users to simplify, assuming admin check is done in app or via specific role check
DROP POLICY IF EXISTS "Allow update for authenticated users" ON "public"."system_settings";
CREATE POLICY "Allow update for authenticated users" ON "public"."system_settings"
FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow insert/all for authenticated users (needed for upsert/first time setup via app if needed)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON "public"."system_settings";
CREATE POLICY "Allow all for authenticated users" ON "public"."system_settings"
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
