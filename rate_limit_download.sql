-- Create a table to track downloads for rate limiting (if not exists)
CREATE TABLE IF NOT EXISTS download_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    photo_id UUID REFERENCES photos(id),
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup of recent downloads
CREATE INDEX IF NOT EXISTS idx_download_logs_user_recent ON download_logs(user_id, downloaded_at DESC);

-- Enable RLS (Security Best Practice)
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

-- Only system can insert/select (no public access needed)
CREATE POLICY "System only access" ON download_logs FOR ALL USING (false); 

-- Update get_download_link to enforce rate limit
CREATE OR REPLACE FUNCTION get_download_link(p_photo_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_photo_url TEXT;
    v_photographer_id UUID;
    v_sale_exists BOOLEAN;
    v_signed_url TEXT;
    v_recent_downloads INT;
    v_MAX_DOWNLOADS_PER_HOUR INT := 20; -- Global limit per user
    v_SIMULTANEOUS_LIMIT INT := 5; -- Limit for same photo in short time
BEGIN
    -- 0. Rate Limiting Check (Cost Optimization)
    
    -- Check total downloads by this user in last hour
    SELECT COUNT(*) INTO v_recent_downloads
    FROM download_logs
    WHERE user_id = auth.uid()
    AND downloaded_at > NOW() - INTERVAL '1 hour';
    
    IF v_recent_downloads >= v_MAX_DOWNLOADS_PER_HOUR THEN
         RETURN jsonb_build_object('success', false, 'error', 'Download limit exceeded. Please wait a while.');
    END IF;

    -- Check downloads of THE SAME photo in last 5 minutes (prevent scripts/loops)
    SELECT COUNT(*) INTO v_recent_downloads
    FROM download_logs
    WHERE user_id = auth.uid()
    AND photo_id = p_photo_id
    AND downloaded_at > NOW() - INTERVAL '5 minutes';

    IF v_recent_downloads >= v_SIMULTANEOUS_LIMIT THEN
         RETURN jsonb_build_object('success', false, 'error', 'Too many requests for this photo.');
    END IF;


    -- 1. Get photo details
    SELECT file_url, photographer_id INTO v_photo_url, v_photographer_id
    FROM photos
    WHERE id = p_photo_id;

    IF v_photo_url IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Photo not found');
    END IF;

    -- 2. Check access permissions
    -- Access granted if:
    -- a) User is the photographer (owner)
    -- b) User has purchased the photo (in sales table with status 'paid')
    
    -- Check ownership
    IF v_photographer_id = auth.uid() THEN
        -- Owner access OK
    ELSE
        -- Check purchase
        SELECT EXISTS (
            SELECT 1 FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            WHERE s.user_id = auth.uid()
            AND si.photo_id = p_photo_id
            AND s.status = 'paid'
        ) INTO v_sale_exists;

        IF NOT v_sale_exists THEN
             RETURN jsonb_build_object('success', false, 'error', 'Access denied. You must purchase this photo to download it.');
        END IF;
    END IF;

    -- 3. Log the download (for Rate Limiting)
    INSERT INTO download_logs (user_id, photo_id) VALUES (auth.uid(), p_photo_id);

    -- 4. Generate Signed URL (valid for 5 minutes)
    v_signed_url := storage.create_signed_url('photos-original', v_photo_url, 300); -- 300 seconds = 5 mins

    RETURN jsonb_build_object('success', true, 'url', v_signed_url);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
