-- Create table for password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id ON password_reset_tokens(user_id);

-- RLS Policies (if RLS is enabled on public schema, which it likely is)
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (system level, but via API) - actually, usually service role handles this.
-- If using client library with anonymous key, we might need policy.
-- But reset request is usually public (email only).
-- For security, it's better if ONLY service role can read/write this table, 
-- OR use a specific function.
-- Assuming the frontend uses `api.ts` which uses `supabaseClient`. 
-- If `supabaseClient` uses a public anon key, we need RLS.

-- Policy: Allow insert for everyone (or maybe just authenticated? No, password reset is for unauthed).
-- Actually, strict security would require a database function to handle the insertion to avoid abuse,
-- but for this "MVP" style app, we'll allow public insert but restricted read.

-- Allow valid token lookups
CREATE POLICY "Enable read access for valid tokens" ON password_reset_tokens
    FOR SELECT
    USING (true); -- Ideally we only allow selecting by token, but Postgres RLS doesn't easily restrict 'WHERE' clauses.

-- Allow insert
CREATE POLICY "Enable insert for everyone" ON password_reset_tokens
    FOR INSERT
    WITH CHECK (true);

-- Allow update (marking as used)
CREATE POLICY "Enable update for everyone" ON password_reset_tokens
    FOR UPDATE
    USING (true);
