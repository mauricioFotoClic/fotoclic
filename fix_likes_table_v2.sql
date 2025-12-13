-- Fix for missing ID column in photo_likes table (Version 2)
-- This script adds the ID column if it doesn't exist.
-- It avoids "multiple primary keys" error by NOT making it a primary key if one already exists.

DO $$
BEGIN
    -- 1. Add 'id' column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'photo_likes'
        AND column_name = 'id'
    ) THEN
        ALTER TABLE photo_likes ADD COLUMN id UUID DEFAULT gen_random_uuid();
    END IF;
    
    -- 2. Make it UNIQUE if it isn't already (Good practice for IDs)
    -- We wrap this in a block to ignore error if constraint already exists
    BEGIN
        ALTER TABLE photo_likes ADD CONSTRAINT photo_likes_id_unique UNIQUE (id);
    EXCEPTION WHEN duplicate_object THEN
        -- Constraint already exists, ignore
        NULL;
    END;

END $$;
