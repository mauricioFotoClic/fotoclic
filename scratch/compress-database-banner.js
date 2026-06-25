import { createClient } from '@supabase/supabase-js';
import { createCanvas, loadImage } from 'canvas';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jzrrwhuletsknujjfdwa.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const photographerId = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f';

async function compress() {
    console.log("Fetching photographer data...");
    const { data: user, error: fetchErr } = await supabase
        .from('users')
        .select('name, banner_url')
        .eq('id', photographerId)
        .single();

    if (fetchErr) {
        console.error("Error fetching photographer:", fetchErr.message);
        return;
    }

    if (!user.banner_url) {
        console.log("Photographer has no banner.");
        return;
    }

    console.log(`Photographer: ${user.name}`);
    console.log(`Original Banner URL length: ${user.banner_url.length} chars (approx ${Math.round(user.banner_url.length / 1024)} KB)`);

    if (!user.banner_url.startsWith('data:')) {
        console.log("Banner is already a URL, not base64. No compression needed.");
        return;
    }

    try {
        console.log("Loading image into node-canvas...");
        const img = await loadImage(user.banner_url);
        
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
        }

        console.log(`Resizing from ${img.width}x${img.height} to ${width}x${height}`);
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 jpeg with quality 0.7
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        console.log(`Compressed Banner length: ${compressedBase64.length} chars (approx ${Math.round(compressedBase64.length / 1024)} KB)`);

        console.log("Updating database with compressed banner...");
        const { error: updateErr } = await supabase
            .from('users')
            .update({ banner_url: compressedBase64 })
            .eq('id', photographerId);

        if (updateErr) {
            console.error("Failed to update database:", updateErr.message);
        } else {
            console.log("SUCCESS! Database updated with compressed banner.");
        }
    } catch (e) {
        console.error("Compression failed:", e);
    }
}

compress();
