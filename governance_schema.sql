-- 1. Add photo_limit to users table (default 50)
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_limit INTEGER DEFAULT 50;

-- 2. Update upload_photo to enforce limit and set initial status to 'pending'
CREATE OR REPLACE FUNCTION public.upload_photo(
    p_photographer_id uuid,
    p_category_id uuid,
    p_title text,
    p_description text,
    p_price numeric,
    p_preview_url text,
    p_file_url text,
    p_thumb_url text,
    p_resolution text,
    p_width integer,
    p_height integer,
    p_tags text[],
    p_is_public boolean,
    p_is_featured boolean,
    p_event_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_photo_id UUID;
    v_current_count INTEGER;
    v_limit INTEGER;
    MAX_DIMENSION CONSTANT INTEGER := 8000;
BEGIN
    -- 0. Check User Limit
    SELECT photo_limit INTO v_limit FROM users WHERE id = auth.uid();
    -- Fallback if user row missing or null
    IF v_limit IS NULL THEN v_limit := 50; END IF;

    SELECT count(*) INTO v_current_count FROM photos WHERE photographer_id = auth.uid();

    IF v_current_count >= v_limit THEN
        INSERT INTO audit_logs (user_id, action, details)
        VALUES (auth.uid(), 'UPLOAD_BLOCKED', 'Photo limit reached: ' || v_current_count || '/' || v_limit);
        RETURN jsonb_build_object('success', false, 'error', 'Limite de fotos atingido (' || v_current_count || '/' || v_limit || '). Contate o suporte para aumentar.');
    END IF;

    -- 1. Validate Base64/URL Length (Legacy check kept but safe for URLs)
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
    -- Note: Removed 'approved' hardcode. Now defaults to 'pending' for moderation.
    INSERT INTO photos (
        photographer_id, category_id, title, description, price, 
        preview_url, file_url, thumb_url, resolution, width, height, 
        tags, is_public, is_featured, event_id, 
        moderation_status, likes_count
    ) VALUES (
        p_photographer_id, p_category_id, p_title, p_description, p_price,
        p_preview_url, p_file_url, p_thumb_url, 
        p_resolution::resolution_type, 
        p_width, p_height,
        p_tags, p_is_public, p_is_featured, p_event_id,
        'pending', 0 
    ) RETURNING id INTO v_photo_id;

    RETURN jsonb_build_object('success', true, 'data', (SELECT row_to_json(photos) FROM photos WHERE id = v_photo_id));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Erro interno no servidor: ' || SQLERRM);
END;
$function$;

-- 3. Create Moderate Photo RPC
CREATE OR REPLACE FUNCTION moderate_photo(
    p_photo_id UUID,
    p_status TEXT, -- 'approved' or 'rejected'
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status_enum moderation_status_type;
BEGIN
    -- Check if user is admin (simple verification for now, or rely on RLS/App logic if restricting execute)
    -- Ideally check public.users.role or is_super_admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
    END IF;

    -- Cast text to enum
    BEGIN
        v_status_enum := p_status::moderation_status_type;
    EXCEPTION WHEN OTHERS THEN
         RETURN jsonb_build_object('success', false, 'error', 'Invalid status. Must be pending, approved, or rejected.');
    END;

    UPDATE photos
    SET 
        moderation_status = v_status_enum,
        rejection_reason = p_reason,
        is_public = (CASE WHEN v_status_enum = 'approved' THEN true ELSE false END) -- Hide if rejected
    WHERE id = p_photo_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
