import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('events').select('*').limit(1);
  if (error) {
    console.error("Error fetching event:", error);
  } else {
    console.log("Event Columns:", data[0] ? Object.keys(data[0]) : "No events found");
  }
}

run().catch(console.error);
