-- Migration: Add video columns to photos table
ALTER TABLE public.photos
ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'photo',
ADD COLUMN IF NOT EXISTS video_uid VARCHAR(255),
ADD COLUMN IF NOT EXISTS video_duration INTEGER;
