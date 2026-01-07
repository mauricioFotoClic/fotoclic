-- Ensure table exists
CREATE TABLE IF NOT EXISTS public.storage_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    photographer_id UUID REFERENCES auth.users(id) NOT NULL,
    current_limit INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.storage_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Photographers can view own requests" ON public.storage_requests;
DROP POLICY IF EXISTS "Photographers can insert requests" ON public.storage_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.storage_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.storage_requests;

-- Create Policies
CREATE POLICY "Photographers can view own requests" ON public.storage_requests
    FOR SELECT TO authenticated
    USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can insert requests" ON public.storage_requests
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Admins can view all requests" ON public.storage_requests
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update requests" ON public.storage_requests
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );


-- RPC: request_storage_limit
CREATE OR REPLACE FUNCTION request_storage_limit()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_current_limit INTEGER;
    v_existing_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Check if already has pending
    SELECT id INTO v_existing_id FROM public.storage_requests 
    WHERE photographer_id = v_user_id AND status = 'pending'
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Você já possui uma solicitação pendente.');
    END IF;

    -- Get current limit
    SELECT photo_limit INTO v_current_limit FROM public.users WHERE id = v_user_id;

    -- Insert
    INSERT INTO public.storage_requests (photographer_id, current_limit)
    VALUES (v_user_id, COALESCE(v_current_limit, 50));

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- RPC: get_storage_requests (Admin)
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
SECURITY DEFINER
AS $$
BEGIN
    -- Check admin (optional if relying purely on RLS, but RPC usually bypasses unless carefully constructed. 
    -- Here we enforce admin check inside or let it run. SECURITY DEFINER = runs as owner.
    -- Better to check role.)
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN; -- Empty result
    END IF;

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
    JOIN public.users u ON sr.photographer_id = u.id
    WHERE (p_status IS NULL OR sr.status = p_status)
    ORDER BY sr.created_at DESC;
END;
$$;

-- RPC: get_my_latest_storage_request (Photographer)
CREATE OR REPLACE FUNCTION get_my_latest_storage_request()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', id,
        'status', status,
        'created_at', created_at,
        'rejection_reason', (
            -- This relies on rejection_reason being somewhere? 
            -- Currently not in table definition above. Oops.
            -- Let's check logs? Or maybe adding a column is better.
            -- Using a generic 'notes' or 'rej_reason' column.
            NULL
        )
    )
    INTO v_result
    FROM public.storage_requests
    WHERE photographer_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN v_result;
END;
$$;

-- Add rejection_reason column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='storage_requests' AND column_name='rejection_reason') THEN
        ALTER TABLE public.storage_requests ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

-- Update RPC get_my_latest_storage_request to include reason
CREATE OR REPLACE FUNCTION get_my_latest_storage_request()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', id,
        'status', status,
        'created_at', created_at,
        'rejection_reason', rejection_reason
    )
    INTO v_result
    FROM public.storage_requests
    WHERE photographer_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN v_result;
END;
$$;

-- RPC: approve_storage_request
CREATE OR REPLACE FUNCTION approve_storage_request(p_request_id UUID, p_new_limit INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

    -- Update Request
    UPDATE public.storage_requests 
    SET status = 'approved', updated_at = now() 
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- RPC: reject_storage_request
CREATE OR REPLACE FUNCTION reject_storage_request(p_request_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    UPDATE public.storage_requests 
    SET status = 'rejected', rejection_reason = p_reason, updated_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
