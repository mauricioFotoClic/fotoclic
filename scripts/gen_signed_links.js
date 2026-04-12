import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function generate() {
    const titles = ['Tênis de Mesa - 45', 'Tênis de Mesa - 49'];
    console.log("Gerando links para:", titles);

    const { data: photos, error } = await supabase
        .from('photos')
        .select('id, title, file_url')
        .in('title', titles);

    if (error || !photos) {
        console.error("Erro:", error);
        return;
    }

    for (const p of photos) {
        const { data, error: storageError } = await supabase
            .storage
            .from('photos-original')
            .createSignedUrl(p.file_url, 3600); // 1 hora

        if (storageError) {
            console.error(`Erro no storage para ${p.title}:`, storageError);
        } else {
            console.log(`Foto: ${p.title}`);
            console.log(`Link: ${data.signedUrl}`);
            console.log('---');
        }
    }
}

generate();
