-- Drop the old function first to change signature/security if needed cleanly
DROP FUNCTION IF EXISTS get_storage_requests(TEXT);

-- Re-create as SECURITY INVOKER (default) so it respects RLS
-- This implies we trust the RLS policies we created earlier.
CREATE OR REPLACE FUNCTION get_storage_requests(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    photographer_id UUID,
    photographer_name TEXT,
    photographer_email TEXT,
    photographer_avatar TEXT,
    current_limit INTEGER,
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
        sr.status,
        sr.created_at
    FROM public.storage_requests sr
    LEFT JOIN public.users u ON sr.photographer_id = u.id
    WHERE (p_status IS NULL OR sr.status = p_status)
    ORDER BY sr.created_at DESC;
END;
$$;
