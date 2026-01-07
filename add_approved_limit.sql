-- Add approved_limit column
ALTER TABLE public.storage_requests ADD COLUMN IF NOT EXISTS approved_limit INTEGER;

-- Update approve_storage_request RPC to save the limit
CREATE OR REPLACE FUNCTION public.approve_storage_request(p_request_id uuid, p_new_limit integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_photographer_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- Get photographer
    SELECT photographer_id INTO v_photographer_id FROM public.storage_requests WHERE id = p_request_id;
    
    IF v_photographer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;

    -- Update User Limit
    UPDATE public.users SET photo_limit = p_new_limit WHERE id = v_photographer_id;

    -- Update Request with approved_limit
    UPDATE public.storage_requests 
    SET status = 'approved', 
        approved_limit = p_new_limit,
        updated_at = now() 
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Update get_storage_requests RPC to return approved_limit
DROP FUNCTION IF EXISTS get_storage_requests(TEXT);
CREATE OR REPLACE FUNCTION get_storage_requests(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    photographer_id UUID,
    photographer_name TEXT,
    photographer_email TEXT,
    photographer_avatar TEXT,
    current_limit INTEGER,
    approved_limit INTEGER,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sr.id,
        sr.photographer_id,
        u.name,
        u.email,
        u.avatar_url,
        sr.current_limit,
        sr.approved_limit,
        sr.status,
        sr.created_at
    FROM public.storage_requests sr
    LEFT JOIN public.users u ON sr.photographer_id = u.id
    WHERE (p_status IS NULL OR sr.status = p_status)
    ORDER BY sr.created_at DESC;
END;
$$;
