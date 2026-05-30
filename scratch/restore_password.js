import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function restore() {
    const userId = '00fcaeec-35e2-46ae-8d1e-6c3c12280460';
    const originalPassword = '@Felipe090411';

    console.log(`Restoring password for Felipe Val to ${originalPassword}...`);
    const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: originalPassword
    });

    if (error) {
        console.error("Error restoring password:", error);
    } else {
        console.log("Password restored successfully!");
    }
}
restore();
