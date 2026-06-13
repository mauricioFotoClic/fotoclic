import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Testing Supabase Storage connection...");
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Storage error:", error);
  } else {
    console.log("Available Buckets:", data.map(b => b.name));
  }
}

run().catch(console.error);
