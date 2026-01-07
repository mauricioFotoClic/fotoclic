-- Create storage_requests table
CREATE TABLE IF NOT EXISTS public.storage_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    photographer_id UUID REFERENCES public.users(id) NOT NULL,
    current_limit INTEGER NOT NULL,
    requested_limit INTEGER, -- Optional, user typically just asks for "more"
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    admin_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.storage_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own requests" ON public.storage_requests
    FOR SELECT USING (auth.uid() = photographer_id);

CREATE POLICY "Users can insert own requests" ON public.storage_requests
    FOR INSERT WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Admins can view all requests" ON public.storage_requests
    FOR Select USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update requests" ON public.storage_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- RPC: Request storage limit
CREATE OR REPLACE FUNCTION request_storage_limit()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_limit INTEGER;
    v_exists BOOLEAN;
BEGIN
    -- Check if already has pending request
    SELECT EXISTS(SELECT 1 FROM storage_requests WHERE photographer_id = auth.uid() AND status = 'pending')
    INTO v_exists;

    IF v_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Já existe uma solicitação pendente.');
    END IF;

    -- Get current limit
    SELECT photo_limit INTO v_current_limit FROM users WHERE id = auth.uid();

    INSERT INTO storage_requests (photographer_id, current_limit)
    VALUES (auth.uid(), COALESCE(v_current_limit, 50));

    RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: Get Requests (Admin)
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
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Acesso negado';
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
    FROM storage_requests sr
    JOIN users u ON sr.photographer_id = u.id
    WHERE (p_status IS NULL OR sr.status = p_status)
    ORDER BY sr.created_at DESC;
END;
$$;

-- RPC: Approve Request
CREATE OR REPLACE FUNCTION approve_storage_request(p_request_id UUID, p_new_limit INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_photographer_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
    END IF;

    SELECT photographer_id INTO v_photographer_id FROM storage_requests WHERE id = p_request_id;
    
    IF v_photographer_id IS NULL THEN
         RETURN jsonb_build_object('success', false, 'error', 'Solicitação não encontrada');
    END IF;

    -- Update User Limit
    UPDATE users SET photo_limit = p_new_limit WHERE id = v_photographer_id;

    -- Update Request Status
    UPDATE storage_requests SET status = 'approved', updated_at = now() WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: Reject Request
CREATE OR REPLACE FUNCTION reject_storage_request(p_request_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
    END IF;

    UPDATE storage_requests 
    SET status = 'rejected', admin_response = p_reason, updated_at = now() 
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
