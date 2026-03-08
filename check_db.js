import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { count, error } = await supabase.from('face_encodings').select('*', { count: 'exact', head: true });
    console.log("Total encodings in DB:", count);
    if (error) console.error("Error:", error);
}
check();
