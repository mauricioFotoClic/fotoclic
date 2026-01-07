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
BEGIN
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

    -- 3. Generate Signed URL (valid for 5 minutes)
    -- Start by removing the bucket name from the path if stored with it, or assume path is relative.
    -- Our standard: file_url = "user_id/event_id/uuid-original.jpg" (Relative path inside photos-original bucket)
    
    v_signed_url := storage.create_signed_url('photos-original', v_photo_url, 300); -- 300 seconds = 5 mins

    RETURN jsonb_build_object('success', true, 'url', v_signed_url);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
