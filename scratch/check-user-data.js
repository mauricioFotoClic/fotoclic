import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jzrrwhuletsknujjfdwa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const photographerId = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f';

async function checkUserData() {
    console.log("Checking photographer data sizes...");
    
    const { data, error } = await supabase
        .from("users")
        .select("id, name, slug, bio, avatar_url, banner_url")
        .eq("id", photographerId)
        .single();
        
    if (error) {
        console.error("Error fetching user data:", error.message);
        return;
    }

    console.log("Name:", data.name);
    console.log("Slug:", data.slug);
    console.log("Bio length:", data.bio?.length || 0);
    console.log("Avatar URL length:", data.avatar_url?.length || 0);
    console.log("Banner URL length:", data.banner_url?.length || 0);
    
    if (data.avatar_url && data.avatar_url.startsWith('data:')) {
        console.log("WARNING: Avatar is a BASE64 image! Size:", Math.round(data.avatar_url.length / 1024), "KB");
    } else {
        console.log("Avatar URL:", data.avatar_url);
    }

    if (data.banner_url && data.banner_url.startsWith('data:')) {
        console.log("WARNING: Banner is a BASE64 image! Size:", Math.round(data.banner_url.length / 1024), "KB");
    } else {
        console.log("Banner URL:", data.banner_url);
    }
}

checkUserData();
