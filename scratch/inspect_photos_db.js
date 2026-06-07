import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectPhotos() {
    try {
        console.log('=== Inspeção Detalhada da Tabela de Fotos ===');

        const { data: photos, error: phError } = await supabase
            .from('photos')
            .select('*')
            .limit(5);

        if (phError) {
            console.error('Erro ao buscar fotos:', phError);
            return;
        }

        console.log(`Total de fotos retornadas (limit 5): ${photos?.length || 0}`);
        if (photos && photos.length > 0) {
            console.log('Exemplo de foto:', JSON.stringify(photos[0], null, 2));
        }

        // Testar select com contagem real
        const { data: allPhotos, error: allErr } = await supabase
            .from('photos')
            .select('id, photographer_id')
            .limit(1000);

        if (allErr) {
            console.error('Erro no select amplo:', allErr);
        } else {
            console.log(`Total de fotos no select amplo (limit 1000): ${allPhotos?.length || 0}`);
            const distinctPhotographers = new Set(allPhotos?.map(p => p.photographer_id) || []);
            console.log('Photographer IDs distintos nas fotos:', Array.from(distinctPhotographers));
        }

    } catch (e) {
        console.error('Erro na execução:', e.message);
    }
}

inspectPhotos();
