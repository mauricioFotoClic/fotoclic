
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Force load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkEncodings() {
    console.log("Checking face_encodings table...");

    // Check total count
    const { count, error } = await supabase
        .from('face_encodings')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error checking count:", error);
    } else {
        console.log(`Total face encodings found: ${count}`);
    }

    // Check recent (optional, just to see if insert worked recently)
    const { data, error: fetchError } = await supabase
        .from('face_encodings')
        .select('created_at, photo_id')
        .order('created_at', { ascending: false })
        .limit(5);

    if (fetchError) {
        console.error("Error fetching recent:", fetchError);
    } else {
        console.log("Most recent encodings:", data);
    }
}

checkEncodings();
