-- Adiciona suporte a vídeos na tabela de fotos
ALTER TABLE "public"."photos" ADD COLUMN IF NOT EXISTS "media_type" text DEFAULT 'photo';
ALTER TABLE "public"."photos" ADD COLUMN IF NOT EXISTS "video_uid" text;
ALTER TABLE "public"."photos" ADD COLUMN IF NOT EXISTS "video_duration" integer;

-- Adiciona taxas de comissão de vídeo em system_settings
ALTER TABLE "public"."system_settings" ADD COLUMN IF NOT EXISTS "commission_video_default_rate" numeric DEFAULT 0.10;
ALTER TABLE "public"."system_settings" ADD COLUMN IF NOT EXISTS "commission_custom_video_rates" jsonb DEFAULT '{}'::jsonb;
