import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testR() {
    // get a real encoding
    const { data: first } = await supabase.from('face_encodings').select('photo_id, descriptor').limit(1);
    if (!first || first.length === 0) return console.log("No encodings");

    const descriptorStr = first[0].descriptor;
    const realEmbedding = JSON.parse(descriptorStr); // vector string '[0.1, ...]' can be parsed as JSON array
    console.log("Photo ID:", first[0].photo_id);

    // search
    const { data: matches, error } = await supabase
        .rpc('match_faces', {
            query_embedding: realEmbedding,
            match_threshold: 0.45,
            match_count: 50
        });

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Matches:", matches);
    }
}
testR();
