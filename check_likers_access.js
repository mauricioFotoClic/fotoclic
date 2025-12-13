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
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLikers() {
    console.log("--- Checking Likers Access ---");

    // 1. Get a photo that has likes
    const { data: photos } = await supabase.from('photos').select('id, title, likes_count').gt('likes_count', 0).limit(1);

    if (!photos || photos.length === 0) {
        console.log("No photos with likes found to test.");
        return;
    }

    const photo = photos[0];
    console.log(`Testing with photo: ${photo.title} (${photo.id}) - Likes: ${photo.likes_count}`);

    // 2. Try to fetch raw lines from photo_likes
    const { data: rawLikes, error: rawError } = await supabase.from('photo_likes').select('*').eq('photo_id', photo.id);
    if (rawError) {
        console.log("Error fetching raw photo_likes:", rawError.message);
    } else {
        console.log(`Raw photo_likes rows: ${rawLikes.length}`);
        if (rawLikes.length > 0) {
            console.log("Sample user_id from likes:", rawLikes[0].user_id);

            // 3. Try to fetch that user details
            const userId = rawLikes[0].user_id;
            const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', userId); // single() might fail if 0 rows

            if (userError) {
                console.log("Error fetching user details from users table:", userError.message);
            } else if (!user || user.length === 0) {
                console.log("User fetch returned NO rows. RLS is likely blocking generic read access.");
            } else {
                console.log("User fetch successful:", user[0].email);
            }
        }
    }

    // 4. Try the relation query used in api.ts
    console.log("Testing relation query...");
    const { data: relData, error: relError } = await supabase
        .from('photo_likes')
        .select('user_id, user:users!photo_likes_user_id_fkey(*)')
        .eq('photo_id', photo.id);

    if (relError) {
        console.log("Relation query failed (Error object):", JSON.stringify(relError, null, 2));
    } else {
        console.log("Relation query success. Rows:", relData.length);
        relData.forEach((row, i) => {
            console.log(`Row ${i} user object:`, row.user);
        });
    }
}

checkLikers();
