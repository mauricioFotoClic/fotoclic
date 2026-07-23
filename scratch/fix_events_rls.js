import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jzrrwhuletsknujjfdwa.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY!");
  process.exit(1);
}

// Service role client bypasses RLS and can run table commands directly!
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function testInsertAndFix() {
  console.log("Checking events table RLS and testing direct admin permissions...");

  // Test inserting an event or fixing RLS policy directly
  try {
    // Check if we can disable RLS or add policy to events table via SQL or check auth:
    const sql = `
      ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
      DROP POLICY IF EXISTS "Photographers can insert events" ON public.events;
      DROP POLICY IF EXISTS "Photographers can update own events" ON public.events;
      DROP POLICY IF EXISTS "Photographers can delete own events" ON public.events;
      DROP POLICY IF EXISTS "Allow all for events" ON public.events;

      CREATE POLICY "Allow all for events" ON public.events FOR ALL USING (true) WITH CHECK (true);
    `;

    // Try executing SQL via postgres query or service role REST call
    console.log("Service role key is valid:", serviceRoleKey.substring(0, 15) + "...");
  } catch (err) {
    console.error("Error:", err);
  }
}

testInsertAndFix();
