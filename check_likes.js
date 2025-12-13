import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse .env.local
let supabaseUrl = '';
let supabaseKey = '';

try {
    const envPath = path.resolve(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                const cleanValue = value.trim().replace(/^["']|["']$/g, '');
                if (key.trim() === 'VITE_SUPABASE_URL') supabaseUrl = cleanValue;
                if (key.trim() === 'VITE_SUPABASE_ANON_KEY') supabaseKey = cleanValue;
            }
        });
    }
} catch (e) {
    console.error("Error reading .env.local", e);
}

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLikesTable() {
    console.log("Checking photo_likes table schema...");

    // Check if table exists in information_schema
    // Note: we can't easily query information_schema with supabase-js standard client if permissions are tight, 
    // but usually anon/service role might have access or we try a direct RPC if available. 
    // Instead, we'll try to insert a dummy row and fail, or just rely on the error message we got before.
    // Actually, the error "column photo_likes.id does not exist" is pretty clear.

    // Let's try to select * and see what we get (limit 0 to just check structure if possible)
    const { data, error } = await supabase.from('photo_likes').select('*').limit(1);

    if (error) {
        console.log("Error selecting *:", error.message);
    } else {
        console.log("Select * success. Rows:", data.length);
        if (data.length > 0) {
            console.log("Columns found:", Object.keys(data[0]));
        } else {
            console.log("Table empty, cannot infer columns from data.");
            // Try to insert a row with just photo_id/user_id (if we had valid UUIDs)
            // Since we don't, we can just assume the error "id does not exist" was real.
        }
    }
}

checkLikesTable();
