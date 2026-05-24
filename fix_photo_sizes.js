import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Service Role Key or URL');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Iniciando varredura retroativa de tamanhos de fotos usando a API do Storage...");

    // 1. Fetch photos where file_size_bytes is null
    const { data: photos, error } = await supabase
        .from('photos')
        .select('id, file_url, media_type')
        .is('file_size_bytes', null);

    if (error) {
        console.error("Erro ao buscar fotos:", error);
        return;
    }

    console.log(`Encontradas ${photos.length} fotos/vídeos sem tamanho registrado.`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        try {
            let sizeBytes = null;

            if (photo.media_type === 'video' || photo.file_url.includes('videodelivery.net')) {
                console.log(`[${i+1}/${photos.length}] Ignorando vídeo (não é possível pegar o tamanho do iframe): ${photo.id}`);
                continue;
            } else {
                // Parse folder path and filename
                const parts = photo.file_url.split('/');
                const fileName = parts.pop();
                const folderPath = parts.join('/');

                const { data: files, error: listError } = await supabase.storage
                    .from('photos-original')
                    .list(folderPath, {
                        limit: 100,
                        search: fileName
                    });

                if (listError) {
                    console.error(`Falha ao listar pasta para a foto ${photo.id}:`, listError);
                } else if (files && files.length > 0) {
                    const fileObj = files.find(f => f.name === fileName);
                    if (fileObj && fileObj.metadata && fileObj.metadata.size) {
                        sizeBytes = fileObj.metadata.size;
                    }
                }
            }

            if (sizeBytes && !isNaN(sizeBytes)) {
                const { error: updateError } = await supabase
                    .from('photos')
                    .update({ file_size_bytes: sizeBytes })
                    .eq('id', photo.id);

                if (updateError) {
                    console.error(`Erro ao atualizar no banco para a foto ${photo.id}:`, updateError);
                    errorCount++;
                } else {
                    console.log(`[${i+1}/${photos.length}] Sucesso: Foto ${photo.id} -> ${(sizeBytes / 1024 / 1024).toFixed(2)} MB`);
                    successCount++;
                }
            } else {
                console.log(`[${i+1}/${photos.length}] Não foi possível obter o tamanho no Storage para a foto ${photo.id}`);
                errorCount++;
            }
        } catch (e) {
            console.error(`Exceção ao processar foto ${photo.id}:`, e.message);
            errorCount++;
        }
    }

    console.log("-----------------------------------------");
    console.log(`Varredura concluída! Sucessos: ${successCount}, Falhas/Ignorados: ${errorCount}`);
}

run();
