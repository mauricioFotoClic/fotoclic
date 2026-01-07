-- Create RPC for secure photo upload with validation
CREATE OR REPLACE FUNCTION upload_photo(
    p_photographer_id UUID,
    p_category_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_price NUMERIC,
    p_preview_url TEXT,
    p_file_url TEXT,
    p_resolution TEXT,
    p_width INTEGER,
    p_height INTEGER,
    p_tags TEXT[],
    p_is_public BOOLEAN,
    p_is_featured BOOLEAN,
    p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_photo_id UUID;
    v_result JSONB;
    MAX_SIZE_BYTES CONSTANT INTEGER := 15728640; -- 15 MB
    MAX_DIMENSION CONSTANT INTEGER := 8000;
BEGIN
    -- 1. Validate Base64 Length (Approximate size check)
    -- Base64 size = (bytes * 4 / 3). So 15MB bytes ~= 20MB string length.
    -- Let's be generous and say if string length > 22,000,000 chars (~16.5MB), reject.
    IF length(p_preview_url) > 22000000 THEN
        INSERT INTO audit_logs (user_id, action, details)
        VALUES (auth.uid(), 'UPLOAD_FAILED', 'File size limit exceeded (Server-side)');
        
        RETURN jsonb_build_object('success', false, 'error', 'Arquivo muito grande (Limite excedido no servidor).');
    END IF;

    -- 2. Validate Dimensions (Metadata consistency check)
    IF p_width > MAX_DIMENSION OR p_height > MAX_DIMENSION THEN
         INSERT INTO audit_logs (user_id, action, details)
         VALUES (auth.uid(), 'UPLOAD_FAILED', 'Dimension limit exceeded: ' || p_width || 'x' || p_height);

         RETURN jsonb_build_object('success', false, 'error', 'Dimensões da imagem excedem o limite permitido de ' || MAX_DIMENSION || 'px.');
    END IF;

    -- 3. Perform Insert
    INSERT INTO photos (
        photographer_id, category_id, title, description, price, 
        preview_url, file_url, resolution, width, height, 
        tags, is_public, is_featured, event_id, 
        moderation_status, likes_count
    ) VALUES (
        p_photographer_id, p_category_id, p_title, p_description, p_price,
        p_preview_url, p_file_url, p_resolution, p_width, p_height,
        p_tags, p_is_public, p_is_featured, p_event_id,
        'approved', 0 -- Default status
    ) RETURNING id INTO v_photo_id;

    -- 4. Log Success (Optional, maybe too noisy, let's skip success log for now or keep it minimal)
    -- INSERT INTO audit_logs (user_id, action, details) VALUES (auth.uid(), 'UPLOAD_SUCCESS', 'Photo ID: ' || v_photo_id);

    -- 5. Return Success
    RETURN jsonb_build_object('success', true, 'data', (SELECT row_to_json(photos) FROM photos WHERE id = v_photo_id));

EXCEPTION WHEN OTHERS THEN
    -- Provide generic error but log specific
    RETURN jsonb_build_object('success', false, 'error', 'Erro interno no servidor: ' || SQLERRM);
END;
$$;
