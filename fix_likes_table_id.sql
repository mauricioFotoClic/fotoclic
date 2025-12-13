-- Fix for missing ID column in photo_likes table
-- This script adds the ID column if it doesn't exist, which is required for the application to function correctly.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'photo_likes'
        AND column_name = 'id'
    ) THEN
        ALTER TABLE photo_likes ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
    END IF;
END $$;
