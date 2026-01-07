CREATE OR REPLACE FUNCTION upload_photo(
    p_photographer_id UUID,
    p_category_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_price NUMERIC,
    p_preview_url TEXT,
    p_file_url TEXT,
    p_thumb_url TEXT,
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
    MAX_DIMENSION CONSTANT INTEGER := 8000;
BEGIN
    -- 1. Validate Base64 Length
    IF length(p_file_url) > 22000000 THEN
        INSERT INTO audit_logs (user_id, action, details)
        VALUES (auth.uid(), 'UPLOAD_FAILED', 'File size limit exceeded (Server-side)');
        RETURN jsonb_build_object('success', false, 'error', 'Arquivo original muito grande (Limite excedido no servidor).');
    END IF;

    -- 2. Validate Dimensions
    IF p_width > MAX_DIMENSION OR p_height > MAX_DIMENSION THEN
         INSERT INTO audit_logs (user_id, action, details)
         VALUES (auth.uid(), 'UPLOAD_FAILED', 'Dimension limit exceeded: ' || p_width || 'x' || p_height);
         RETURN jsonb_build_object('success', false, 'error', 'Dimensões da imagem excedem o limite permitido.');
    END IF;

    -- 3. Perform Insert with CAST
    INSERT INTO photos (
        photographer_id, category_id, title, description, price, 
        preview_url, file_url, thumb_url, resolution, width, height, 
        tags, is_public, is_featured, event_id, 
        moderation_status, likes_count
    ) VALUES (
        p_photographer_id, p_category_id, p_title, p_description, p_price,
        p_preview_url, p_file_url, p_thumb_url, 
        p_resolution::resolution_type, -- CAST HERE
        p_width, p_height,
        p_tags, p_is_public, p_is_featured, p_event_id,
        'approved', 0
    ) RETURNING id INTO v_photo_id;

    RETURN jsonb_build_object('success', true, 'data', (SELECT row_to_json(photos) FROM photos WHERE id = v_photo_id));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Erro interno no servidor: ' || SQLERRM);
END;
$$;
