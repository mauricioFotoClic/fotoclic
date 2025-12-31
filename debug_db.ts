
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugDB() {
    console.log('--- DB DEBUG START ---');

    // 1. Count rows
    const { count, error: countError } = await supabase
        .from('face_encodings')
        .select('*', { count: 'exact', head: true });

    if (countError) console.error('Count Error:', countError);
    else console.log(`Total Encodings: ${count}`);

    // 2. Fetch one row to check descriptor format
    const { data: sample, error: sampleError } = await supabase
        .from('face_encodings')
        .select('id, descriptor')
        .limit(1);

    if (sampleError) console.error('Sample Error:', sampleError);
    else if (sample && sample.length > 0) {
        const desc = sample[0].descriptor;
        console.log('Sample ID:', sample[0].id);
        console.log('Descriptor Type:', typeof desc);
        console.log('Is Array?', Array.isArray(desc));
        if (typeof desc === 'string') { // pgvector sometimes returns string "[1,2,3...]"
            console.log('Descriptor is string, length:', desc.length);
            console.log('Snippet:', desc.substring(0, 50));
        } else if (Array.isArray(desc)) {
            console.log('Descriptor is array, length:', desc.length);
        }
    } else {
        console.log('Table is EMPTY.');
    }

    // 3. Test RPC function directly if possible (mock vector)
    // We can't easy mock a valid face vector, but we can try a dummy zero vector just to see if RPC errors
    console.log('Testing RPC match_faces with dummy vector...');
    const dummyVector = new Array(128).fill(0.1);
    const { data: rpcData, error: rpcError } = await supabase
        .rpc('match_faces', {
            query_embedding: dummyVector,
            match_threshold: 0.8,
            match_count: 5
        });

    if (rpcError) console.error('RPC Error:', rpcError);
    else console.log('RPC Result Count:', rpcData?.length);

    console.log('--- DB DEBUG END ---');
}

debugDB();
