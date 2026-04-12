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
    // Remove direct onnx/tfjs reference to let it auto-select what's available
    // and provide node-specific overrides
    face: {
        enabled: true,
        detector: { return: true, rotation: true },
        description: { enabled: true }
    }
};

async function testOne() {
    const photoId = 'dfa84ace-c3a7-4b92-935d-955f7341a4f0';
    console.log("Testando indexação da foto:", photoId);

    const { data: photo } = await supabase.from('photos').select('*').eq('id', photoId).single();
    if (!photo) return console.log("Foto não encontrada");

    // @ts-ignore
    const human = new Human(humanConfig);
    
    // Disable native backend requirements
    // @ts-ignore
    human.env.node = true;
    // @ts-ignore
    human.env.browser = false;

    console.log("Baixando modelos...");
    await human.load();
    console.log("Modelos carregados.");

    console.log("Processando imagem:", photo.preview_url);
    const response = await fetch(photo.preview_url);
    const buffer = await response.arrayBuffer();
    const img = await loadImage(Buffer.from(buffer));

    console.log("Detectando...");
    const result = await human.detect(img);
    
    console.log("Faces encontradas:", result.face?.length || 0);

    if (result.face && result.face.length > 0) {
        result.face.forEach((f, i) => {
            console.log(`Rosto ${i}: Score=${f.score}, Box=${JSON.stringify(f.box)}`);
        });

        const embedding = result.face[0].embedding;
        const descriptor = `[${embedding.join(',')}]`;
        
        const { error } = await supabase.from('face_encodings').insert({
            photo_id: photoId,
            descriptor,
            model_version: 'human-node-wasm'
        });
        
        if (error) {
            console.error("Erro ao salvar:", error.message);
        } else {
            console.log("Sincronizado com o banco!");
            await supabase.from('photos').update({ is_face_indexed: true }).eq('id', photoId);
        }
    } else {
        console.log("Nenhum rosto detectado na imagem com marca d'água.");
        console.log("Tentando com Thumb URL...");
        
        const response2 = await fetch(photo.thumb_url);
        const buffer2 = await response2.arrayBuffer();
        const img2 = await loadImage(Buffer.from(buffer2));
        const result2 = await human.detect(img2);
        
        console.log("Faces na Thumb:", result2.face?.length || 0);
    }
}

testOne().catch(e => console.error(e));
