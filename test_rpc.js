import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPC() {
    console.log("Testing RPC...");
    const fakeDescriptor = new Array(1024).fill(0.1);

    const { data: matches, error } = await supabase
        .rpc('match_faces', {
            query_embedding: fakeDescriptor,
            match_threshold: 0.45,
            match_count: 50
        });

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("RPC Success. Matches:", matches ? matches.length : 0);
    }
}

testRPC();
