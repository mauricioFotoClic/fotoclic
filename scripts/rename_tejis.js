import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function rename() {
    console.log("Renomeando fotos...");
    
    // Pegar todas que dão match para processar uma a uma ou via rpc se disponível.
    // Como não tenho certeza do RPC 'execute_sql', vou fazer via API do supabase de forma segura.
    
    const { data: photos, error } = await supabase
        .from('photos')
        .select('id, title')
        .ilike('title', '%TEJIS DE MESA%');

    if (error) {
        console.error("Erro ao buscar fotos:", error);
        return;
    }

    console.log(`Encontradas ${photos.length} fotos.`);

    let count = 0;
    for (const photo of photos) {
        // Substitui "Tejis" por "Tênis" mantendo o resto do nome (inclusive números)
        const newTitle = photo.title
            .replace(/Tejis de Mesa/g, "Tênis de Mesa")
            .replace(/TEJIS DE MESA/g, "TÊNIS DE MESA");

        const { error: updError } = await supabase
            .from('photos')
            .update({ title: newTitle })
            .eq('id', photo.id);

        if (updError) {
            console.error(`Erro ao atualizar ${photo.id}:`, updError);
        } else {
            count++;
        }
    }

    console.log(`Concluído! ${count} fotos renomeadas.`);
}

rename();
