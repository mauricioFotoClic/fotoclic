-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- Only admins can read logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT
    USING (
        auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    );

-- Any authenticated user can insert (via RPC mostly, but safe to allow app to log events)
CREATE POLICY "Users can insert audit logs" ON audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
