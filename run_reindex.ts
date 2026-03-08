import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { Human, Config } from '@vladmandic/human';
import { Image, Canvas, ImageData } from 'canvas';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const humanConfig: Partial<Config> = {
    modelBasePath: 'file://node_modules/@vladmandic/human/models',
    filter: { enabled: false },
    backend: 'cpu', // Using CPU for NodeJS environment
    face: {
        enabled: true,
        detector: { return: true, rotation: true },
        mesh: { enabled: false },
        attention: { enabled: false },
        iris: { enabled: false },
        description: { enabled: true },
        emotion: { enabled: false },
        antispoof: { enabled: false },
        liveness: { enabled: false }
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    gesture: { enabled: false }
};

async function loadImage(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load image at ${url}: ${err.message}`));
        // cross origin bypass using raw buffers if standard doesn't work can be added here
        img.src = url;
    });
}

function resizeCanvas(img: any, maxSize = 1280): any {
    let width = img.width;
    let height = img.height;

    if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
    }

    // Vladmandic/human in NodeJS expects native JS Canvas or Tensor. We use canvas lib.
    const canvas = new Canvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
}

async function bulkReindex() {
    console.log("Initializing Human AI in NodeJS Environment...");

    // Patch global Canvas for Human to work in NodeJS
    globalThis.Canvas = Canvas as any;
    globalThis.Image = Image as any;
    globalThis.ImageData = ImageData as any;

    const human = new Human(humanConfig);
    try {
        await human.load();
        console.log("Models loaded successfully. Starting Database sync...");
    } catch (e) {
        console.error("Failed to load Human AI models. Ensure they exist locally:", e);
        console.log("Falling back: try running inside the browser via Admin Dashboard instead if models fail here.");
        return;
    }

    // Fetch pending photos
    let { data: pendingPhotos, error } = await supabase
        .from('photos')
        .select('id, file_url')
        .eq('is_face_indexed', false);

    if (error || !pendingPhotos) {
        console.error("Error fetching photos to index:", error);
        return;
    }

    if (pendingPhotos.length === 0) {
        console.log("All photos are already indexed with the new technology!");
        return;
    }

    console.log(`Found ${pendingPhotos.length} photos. Processing...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pendingPhotos.length; i++) {
        const photo = pendingPhotos[i];
        try {
            process.stdout.write(`[${i + 1}/${pendingPhotos.length}] Processing ${photo.id.slice(0, 6)}... `);

            const img = await loadImage(photo.file_url);
            const canvas = resizeCanvas(img);

            // @ts-ignore (NodeJS specific canvas pass)
            const result = await human.detect(canvas);
            const faces = result.face;

            if (!faces || faces.length === 0) {
                console.log("No face detected (skipping).");
                failCount++;
                continue; // proceed to next, just log
            }

            const encodings = faces
                .filter(f => f.embedding)
                .map(f => ({
                    photo_id: photo.id,
                    descriptor: `[${Array.from(f.embedding!).join(',')}]`
                }));

            const { error: insErr } = await supabase
                .from('face_encodings')
                .insert(encodings);

            if (insErr) throw insErr;

            await supabase
                .from('photos')
                .update({ is_face_indexed: true })
                .eq('id', photo.id);

            console.log(`✅ Indexed ${encodings.length} face(s).`);
            successCount++;

        } catch (e: any) {
            console.log(`❌ Error: ${e.message}`);
            failCount++;
        }
    }

    console.log(`\n--- REINDEXING COMPLETE ---`);
    console.log(`Successfully Indexed: ${successCount}`);
    console.log(`Failed / No Face Found: ${failCount}`);
}

bulkReindex();
