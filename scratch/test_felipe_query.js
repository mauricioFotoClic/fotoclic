import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const userId = '00fcaeec-35e2-46ae-8d1e-6c3c12280460';
    const email = 'felipevalgames@gmail.com';
    const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);

    console.log("Signing in Felipe Val...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: 'tempTestPassword123!'
    });

    if (authError) {
        console.error("Auth Error:", authError);
        return;
    }

    const felipeClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
    await felipeClient.auth.setSession(authData.session);

    console.log("Querying sales with explicit relationship path as Felipe Val...");
    const { data, error } = await felipeClient
        .from("sales")
        .select("*, photo:photos(*, photographer:users!photos_photographer_id_fkey(name))")
        .eq("buyer_id", userId)
        .order("sale_date", { ascending: false });

    console.log("Query error:", error);
    console.log("Query data count:", data?.length);
    if (data && data.length > 0) {
        console.log("First sale photo photographer:", data[0].photo.photographer);
    }
}
check();
