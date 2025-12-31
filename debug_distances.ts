
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDistances() {
    console.log('--- DIAGNOSTIC: Checking Face Encodings ---');

    // 1. Fetch up to 5 encodings
    const { data: encodings, error } = await supabase
        .from('face_encodings')
        .select('id, photo_id, descriptor')
        .limit(5);

    if (error) {
        console.error('Error fetching encodings:', error);
        return;
    }

    if (!encodings || encodings.length === 0) {
        console.log('❌ TABLE IS EMPTY. No encodings found.');
        return;
    }

    console.log(`✅ Found ${encodings.length} encodings.`);

    // 2. Check for null/zero vectors
    const firstDesc = JSON.parse(encodings[0].descriptor);
    const isAllZero = firstDesc.every((n: number) => n === 0);
    console.log(`First Vector Sample (5 dims): [${firstDesc.slice(0, 5).join(', ')}...]`);
    console.log(`Vector Length: ${firstDesc.length}`);
    if (isAllZero) {
        console.error('❌ CRITICAL: Vector contains only ZEROS. Indexing is broken.');
        return;
    }

    // 3. Calculate pairwise distances (Cosine Distance)
    // Distance = 1 - CosineSimilarity
    // CosSim = (A . B) / (||A|| * ||B||)
    // FaceAPI descriptors are usually normalized, so ||A|| = 1.
    // So Dist = 1 - (A . B)

    if (encodings.length < 2) {
        console.log('⚠️ Not enough data to compare (need at least 2).');
        return;
    }

    console.log('\n--- Pairwise Distances (Lower is better match) ---');
    for (let i = 0; i < encodings.length; i++) {
        for (let j = i + 1; j < encodings.length; j++) {
            const vecA = JSON.parse(encodings[i].descriptor);
            const vecB = JSON.parse(encodings[j].descriptor);

            const dist = calculateCosineDistance(vecA, vecB);
            console.log(`Photo ${encodings[i].photo_id.slice(0, 4)} vs Photo ${encodings[j].photo_id.slice(0, 4)}: ${dist.toFixed(4)}`);
        }
    }
}

function calculateCosineDistance(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return 1 - similarity;
    // Note: pgvector <=> operator might return slightly different values depending on implementation, 
    // but 1 - cosine_similarity is the standard definition of cosine distance.
}

checkDistances();
