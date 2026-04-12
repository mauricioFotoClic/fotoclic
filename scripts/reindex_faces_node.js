import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { Human } from '@vladmandic/human';
import { Canvas, loadImage, Image } from 'canvas';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const humanConfig = {
    modelBasePath: 'https://vladmandic.github.io/human/models',
    filter: { enabled: false },
    backend: 'onnx', // Use ONNX on Node.js
    face: {
        enabled: true,
        detector: { return: true, rotation: true },
        description: { enabled: true }
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    gesture: { enabled: false }
};

async function start() {
    console.log("--- 🚀 Iniciando Re-indexação Facial (Node.js) ---");
    
    // @ts-ignore
    const human = new Human(humanConfig);
    console.log("Carregando modelos Human AI...");
    await human.load();
    await human.warmup();
    console.log("Modelos prontos.");

    const { data: photos, error } = await supabase
        .from('photos')
        .select('id, preview_url, title')
        .eq('is_face_indexed', false)
        .order('created_at', { ascending: false });

    if (error || !photos) {
        console.error("Erro ao buscar fotos:", error);
        return;
    }

    console.log(`Encontradas ${photos.length} fotos aguardando indexação.`);

    let success = 0;
    let failed = 0;
    let noFaces = 0;

    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        process.stdout.write(`[${i + 1}/${photos.length}] Processando: ${photo.title} (${photo.id.slice(0,8)})... `);

        try {
            // Download image
            const response = await fetch(photo.preview_url);
            const buffer = await response.buffer();
            const img = await loadImage(buffer);

            // Detect faces
            const result = await human.detect(img);
            
            if (!result.face || result.face.length === 0) {
                console.log("⚠️ Nenhum rosto detectado.");
                // Mark as indexed anyway so we don't try again forever, but maybe with a flag?
                // For now, let's mark it as indexed to clean up the queue.
                await supabase.from('photos').update({ is_face_indexed: true }).eq('id', photo.id);
                noFaces++;
                continue;
            }

            const encodings = result.face
                .filter(f => f.embedding)
                .map((f, idx) => ({
                    photo_id: photo.id,
                    face_index: idx,
                    descriptor: `[${f.embedding.join(',')}]`,
                    model_version: 'human-node-onnx',
                    // Optional metadata if schema allows
                    // x: Math.round(f.box[0]),
                    // y: Math.round(f.box[1]),
                    // w: Math.round(f.box[2]),
                    // h: Math.round(f.box[3]),
                    // quality_score: f.score
                }));

            if (encodings.length === 0) {
                console.log("⚠️ Rostos detectados sem embedding.");
                await supabase.from('photos').update({ is_face_indexed: true }).eq('id', photo.id);
                noFaces++;
                continue;
            }

            // Insert into face_encodings
            const { error: insErr } = await supabase
                .from('face_encodings')
                .insert(encodings);

            if (insErr) {
                console.log("❌ Erro DB:", insErr.message);
                failed++;
                continue;
            }

            // Mark photo as indexed
            await supabase.from('photos').update({ is_face_indexed: true }).eq('id', photo.id);

            console.log(`✅ ${encodings.length} rosto(s) indexado(s).`);
            success++;

        } catch (err) {
            console.log("❌ Erro Processamento:", err.message);
            failed++;
        }
    }

    console.log(`\n--- Finalizado ---`);
    console.log(`Sucesso: ${success}`);
    console.log(`Nenhum rosto: ${noFaces}`);
    console.log(`Falhas: ${failed}`);
}

start();
