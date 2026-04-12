import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIndexing() {
    const photoId = 'dfa84ace-c3a7-4b92-935d-955f7341a4f0'; // Tejis de Mesa - 44
    console.log("Checking indexing for photo:", photoId);

    const { data: photo, error: photoError } = await supabase
        .from('photos')
        .select('id, title, is_face_indexed')
        .eq('id', photoId)
        .single();

    if (photoError) {
        console.error("Photo not found:", photoError);
        return;
    }

    console.log("Photo metadata:", photo);

    const { data: encodings, error: encError } = await supabase
        .from('face_encodings')
        .select('*')
        .eq('photo_id', photoId);

    if (encError) {
        console.error("Error fetching encodings:", encError);
        return;
    }

    console.log(`Found ${encodings?.length || 0} faces in this photo.`);
    if (encodings && encodings.length > 0) {
        encodings.forEach((enc, i) => {
            console.log(`Face ${i} model version:`, enc.model_version);
            // console.log(`Face ${i} descriptor sample:`, JSON.stringify(enc.descriptor).substring(0, 100));
        });
    }
}

checkIndexing();
