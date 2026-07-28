-- Create RPC for batch photo uploads (High Performance Bulk Insert)
CREATE OR REPLACE FUNCTION upload_photos_batch(
    p_photos JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inserted_photos JSONB;
    v_count INTEGER;
BEGIN
    -- Perform bulk insert from JSONB array
    WITH inserted AS (
        INSERT INTO photos (
            photographer_id,
            category_id,
            title,
            description,
            price,
            preview_url,
            file_url,
            thumb_url,
            resolution,
            width,
            height,
            tags,
            is_public,
            is_featured,
            event_id,
            sub_group,
            original_filename,
            file_size_bytes,
            moderation_status,
            likes_count
        )
        SELECT
            (elem->>'photographer_id')::UUID,
            (elem->>'category_id')::UUID,
            elem->>'title',
            COALESCE(elem->>'description', ''),
            (elem->>'price')::NUMERIC,
            elem->>'preview_url',
            COALESCE(elem->>'file_url', ''),
            COALESCE(elem->>'thumb_url', ''),
            COALESCE(elem->>'resolution', '4K'),
            (elem->>'width')::INTEGER,
            (elem->>'height')::INTEGER,
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(elem->'tags')), ARRAY[]::TEXT[]),
            COALESCE((elem->>'is_public')::BOOLEAN, true),
            false,
            (elem->>'event_id')::UUID,
            elem->>'sub_group',
            elem->>'original_filename',
            (elem->>'file_size_bytes')::BIGINT,
            'approved',
            0
        FROM jsonb_array_elements(p_photos) AS elem
        RETURNING *
    )
    SELECT 
        jsonb_agg(row_to_json(inserted)),
        COUNT(*)
    INTO v_inserted_photos, v_count
    FROM inserted;

    RETURN jsonb_build_object(
        'success', true,
        'count', COALESCE(v_count, 0),
        'data', COALESCE(v_inserted_photos, '[]'::jsonb)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Erro interno ao inserir lote de fotos: ' || SQLERRM
    );
END;
$$;
