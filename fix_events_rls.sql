-- Allow public read access to events table
-- This allows Admins to see events in the panel, and customers to see events in the marketplace

-- Enable RLS (just in case)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing restricted policies if any (optional, but good practice to clear conflicts if we want full public access)
-- DROP POLICY IF EXISTS "Users can view own events" ON events; 

-- Create a policy that allows EVERYONE (anon and authenticated) to SELECT events
DROP POLICY IF EXISTS "Public can view events" ON events;

CREATE POLICY "Public can view events" ON events
FOR SELECT
USING (true);

-- Ensure photographers can still Insert/Update/Delete their own events
DROP POLICY IF EXISTS "Photographers can manage own events" ON events;

CREATE POLICY "Photographers can manage own events" ON events
FOR ALL
USING (auth.uid() = photographer_id);
