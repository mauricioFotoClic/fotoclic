import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function testRpcCall() {
    const testData = {
        p_photographer_id: '394d208c-07b3-49aa-a04b-63630cb85bb7', // Valid photographer uuid
        p_category_id: 'cb6b91db-753d-4c37-a16f-124b8f36c5cc', // Valid category uuid
        p_title: 'Test Video 1',
        p_description: 'Test description',
        p_price: 10.00,
        p_preview_url: 'https://videodelivery.net/test-uid/thumbnails/thumbnail.gif',
        p_file_url: 'https://iframe.videodelivery.net/test-uid',
        p_thumb_url: 'https://videodelivery.net/test-uid/thumbnails/thumbnail.jpg',
        p_resolution: 'HD',
        p_width: null, // Set to null instead of undefined
        p_height: null, // Set to null instead of undefined
        p_tags: ['test'],
        p_is_public: true,
        p_is_featured: false,
        p_event_id: '35d79900-50d4-4ccb-ba52-c38d6df022be' // Valid event uuid
    };

    console.log("Calling RPC upload_photo...");
    const { data, error } = await supabase.rpc('upload_photo', testData);

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("RPC Success:", data);
    }
}

testRpcCall();
