/**
 * Reindex all photos in Supabase using Amazon Rekognition.
 *
 * Usage:
 *   node scripts/reindex-rekognition.js           (only unindexed photos)
 *   node scripts/reindex-rekognition.js --all     (force reindex everything)
 *   node scripts/reindex-rekognition.js --dry-run (show count only, no indexing)
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import {
    RekognitionClient,
    IndexFacesCommand,
    CreateCollectionCommand,
} from '@aws-sdk/client-rekognition';

dotenv.config({ path: '.env.local' });

// ── Config ────────────────────────────────────────────────────────────────────
const COLLECTION_ID    = process.env.AWS_REKOGNITION_COLLECTION_ID || 'fotoclic-faces';
const CONCURRENCY      = 3;   // simultaneous Rekognition requests
const DELAY_MS         = 300; // ms between batches (avoid rate limit)
const forceAll         = process.argv.includes('--all');
const dryRun           = process.argv.includes('--dry-run');

// ── Clients ───────────────────────────────────────────────────────────────────
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const rekognition = new RekognitionClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function progress(current, total, successes, failures) {
    const pct  = Math.round((current / total) * 100);
    const bar  = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
    process.stdout.write(
        `\r[${bar}] ${pct}%  ${current}/${total}  ✓ ${successes}  ✗ ${failures}   `
    );
}

async function ensureCollection() {
    try {
        await rekognition.send(new CreateCollectionCommand({ CollectionId: COLLECTION_ID }));
        console.log(`Collection '${COLLECTION_ID}' criada.`);
    } catch (err) {
        if (err.name === 'ResourceAlreadyExistsException') {
            console.log(`Collection '${COLLECTION_ID}' já existe.`);
        } else throw err;
    }
}

async function toJpegBuffer(imageUrl) {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const inputBuffer = Buffer.from(await res.arrayBuffer());
    // sharp converte WebP, AVIF, PNG, JPEG → JPEG (suportado pelo Rekognition)
    return sharp(inputBuffer).jpeg({ quality: 92 }).toBuffer();
}

async function indexPhoto(photo) {
    const imageUrl = photo.preview_url || photo.thumb_url;
    if (!imageUrl) return { status: 'skip', reason: 'sem URL' };

    // Convert to JPEG (handles WebP, AVIF, PNG, etc.)
    let imageBuffer;
    try {
        imageBuffer = await toJpegBuffer(imageUrl);
    } catch (e) {
        return { status: 'error', reason: `Falha ao carregar imagem: ${e.message}` };
    }

    // Remove old encodings for this photo
    await supabase.from('face_encodings').delete().eq('photo_id', photo.id);

    // Index via Rekognition
    const result = await rekognition.send(new IndexFacesCommand({
        CollectionId:        COLLECTION_ID,
        Image:               { Bytes: imageBuffer },
        ExternalImageId:     photo.id,
        DetectionAttributes: [],
        MaxFaces:            20,
        QualityFilter:       'AUTO',
    }));

    const faceRecords = result.FaceRecords || [];

    if (faceRecords.length > 0) {
        const encodings = faceRecords.map((rec, idx) => ({
            photo_id:            photo.id,
            face_index:          idx,
            rekognition_face_id: rec.Face.FaceId,
            model_version:      'rekognition-v1',
        }));
        const { error } = await supabase.from('face_encodings').insert(encodings);
        if (error) return { status: 'error', reason: error.message };
    }

    await supabase.from('photos').update({ is_face_indexed: true }).eq('id', photo.id);

    return { status: 'ok', faces: faceRecords.length };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🔍 FotoClic — Reindexação Rekognition\n');

    await ensureCollection();

    // Fetch photos
    let query = supabase.from('photos').select('id, preview_url, thumb_url').order('created_at');
    if (!forceAll) query = query.eq('is_face_indexed', false);

    const { data: photos, error } = await query;
    if (error) { console.error('Erro ao buscar fotos:', error.message); process.exit(1); }

    const total = photos.length;
    if (total === 0) {
        console.log('Nenhuma foto para indexar. Use --all para forçar reindexação de todas.');
        return;
    }

    console.log(`\n📸 ${total} fotos para indexar${forceAll ? ' (modo --all)' : ''}`);
    if (dryRun) { console.log('Modo --dry-run: nenhuma indexação será feita.'); return; }
    console.log('');

    let current = 0, successes = 0, failures = 0, noFace = 0;
    const errors = [];

    // Process in batches of CONCURRENCY
    for (let i = 0; i < total; i += CONCURRENCY) {
        const batch = photos.slice(i, i + CONCURRENCY);

        await Promise.all(batch.map(async photo => {
            try {
                const result = await indexPhoto(photo);
                if (result.status === 'ok') {
                    if (result.faces === 0) noFace++;
                    else successes++;
                } else {
                    failures++;
                    errors.push({ id: photo.id, reason: result.reason });
                }
            } catch (err) {
                failures++;
                errors.push({ id: photo.id, reason: err.message });
            } finally {
                current++;
                progress(current, total, successes, failures);
            }
        }));

        if (i + CONCURRENCY < total) await sleep(DELAY_MS);
    }

    console.log('\n\n✅ Concluído!\n');
    console.log(`   Rostos indexados : ${successes} fotos`);
    console.log(`   Sem rosto        : ${noFace} fotos`);
    console.log(`   Erros            : ${failures} fotos`);

    if (errors.length > 0) {
        console.log('\n❌ Erros detalhados:');
        errors.slice(0, 20).forEach(e => console.log(`   ${e.id}: ${e.reason}`));
        if (errors.length > 20) console.log(`   ... e mais ${errors.length - 20}`);
    }
}

main().catch(err => {
    console.error('\nErro fatal:', err.message);
    process.exit(1);
});
