import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

function calculateCosine(a: number[], b: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateEuclidean(a: number[], b: number[]) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

async function testMatch() {
    const { data: encodings, error } = await supabase
        .from('face_encodings')
        .select('id, photo_id, descriptor')
        .limit(10);

    const out: string[] = [];
    if (encodings) {
        for (let i = 0; i < encodings.length; i++) {
            for (let j = i + 1; j < encodings.length; j++) {
                const vecA = JSON.parse(encodings[i].descriptor);
                const vecB = JSON.parse(encodings[j].descriptor);
                const cos = calculateCosine(vecA, vecB);
                const euc = calculateEuclidean(vecA, vecB);
                out.push(`Photo ${encodings[i].photo_id.slice(0, 4)} vs Photo ${encodings[j].photo_id.slice(0, 4)} -> CosSim: ${cos.toFixed(4)} CosDist: ${(1 - cos).toFixed(4)} EucDist: ${euc.toFixed(4)}`);
            }
        }
    }
    fs.writeFileSync('manual_distances.txt', out.join('\n'));
}

testMatch();
