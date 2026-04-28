import {
    RekognitionClient,
    IndexFacesCommand,
    SearchFacesByImageCommand,
    DeleteFacesCommand,
    CreateCollectionCommand,
} from '@aws-sdk/client-rekognition';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Vercel: increase body size limit for base64 image uploads
export const config = {
    api: { bodyParser: { sizeLimit: '15mb' } },
};

const rekognition = new RekognitionClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const COLLECTION_ID = process.env.AWS_REKOGNITION_COLLECTION_ID || 'fotoclic-faces';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action } = req.body;

    if (action === 'healthcheck') {
        let sharpOk = false;
        try { await sharp(Buffer.from([])).jpeg().toBuffer().catch(() => {}); sharpOk = true; } catch {}
        return res.json({
            ok: true,
            hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
            hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION,
            collection: process.env.AWS_REKOGNITION_COLLECTION_ID,
            sharpLoaded: sharpOk,
            nodeVersion: process.version,
        });
    }

    try {
        if (action === 'indexFaces') return await handleIndexFaces(req, res);
        if (action === 'searchFaces') return await handleSearchFaces(req, res);
        if (action === 'deleteFaces') return await handleDeleteFaces(req, res);
        if (action === 'createCollection') return await handleCreateCollection(req, res);
        return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
        console.error('[Rekognition] Error:', error);
        return res.status(500).json({
            error: error.message || 'Unknown error',
            name: error.name,
            action: req.body?.action,
        });
    }
}

async function handleIndexFaces(req, res) {
    const { photoId, imageUrl } = req.body;

    if (!photoId || !imageUrl) {
        return res.status(400).json({ error: 'photoId and imageUrl are required' });
    }

    // Fetch image and convert to JPEG (Rekognition does not support WebP)
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error(`Failed to fetch image: ${imgResponse.statusText}`);
    const rawBuffer = Buffer.from(await imgResponse.arrayBuffer());
    const imageBuffer = await sharp(rawBuffer).jpeg({ quality: 92 }).toBuffer();

    const command = new IndexFacesCommand({
        CollectionId: COLLECTION_ID,
        Image: { Bytes: imageBuffer },
        ExternalImageId: photoId,
        DetectionAttributes: [],
        MaxFaces: 20,
        QualityFilter: 'AUTO',
    });

    const result = await rekognition.send(command);
    const faceRecords = result.FaceRecords || [];

    // Mark as indexed regardless of face count
    if (faceRecords.length === 0) {
        await supabase.from('photos').update({ is_face_indexed: true }).eq('id', photoId);
        return res.json({ success: true, facesIndexed: 0 });
    }

    // Delete any old encodings for this photo (re-indexing scenario)
    await supabase.from('face_encodings').delete().eq('photo_id', photoId);

    const encodings = faceRecords.map((record, idx) => ({
        photo_id:            photoId,
        face_index:          idx,
        rekognition_face_id: record.Face.FaceId,
        model_version:       'rekognition-v1',
    }));

    const { error } = await supabase.from('face_encodings').insert(encodings);
    if (error) throw error;

    await supabase.from('photos').update({ is_face_indexed: true }).eq('id', photoId);

    return res.json({ success: true, facesIndexed: faceRecords.length });
}

async function handleSearchFaces(req, res) {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 is required' });
    }

    // Strip data URL prefix if present, then convert to JPEG (Rekognition rejects WebP)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const rawBuffer = Buffer.from(base64Data, 'base64');
    const imageBuffer = await sharp(rawBuffer).jpeg({ quality: 92 }).toBuffer();

    const command = new SearchFacesByImageCommand({
        CollectionId: COLLECTION_ID,
        Image: { Bytes: imageBuffer },
        MaxFaces: 100,
        FaceMatchThreshold: 80, // 80% similarity minimum
    });

    const result = await rekognition.send(command);
    const faceMatches = result.FaceMatches || [];

    // ExternalImageId is our photo_id
    const uniquePhotoIds = [...new Set(faceMatches.map(m => m.Face.ExternalImageId))];

    const matches = faceMatches.map(m => ({
        photoId: m.Face.ExternalImageId,
        faceId: m.Face.FaceId,
        similarity: m.Similarity,
        confidence: m.Face.Confidence,
    }));

    return res.json({ success: true, photoIds: uniquePhotoIds, matches });
}

async function handleDeleteFaces(req, res) {
    const { faceIds } = req.body;

    if (!faceIds || faceIds.length === 0) {
        return res.status(400).json({ error: 'faceIds array is required' });
    }

    const command = new DeleteFacesCommand({
        CollectionId: COLLECTION_ID,
        FaceIds: faceIds,
    });

    await rekognition.send(command);
    return res.json({ success: true, deleted: faceIds.length });
}

async function handleCreateCollection(req, res) {
    const command = new CreateCollectionCommand({ CollectionId: COLLECTION_ID });
    try {
        await rekognition.send(command);
        return res.json({ success: true, message: `Collection '${COLLECTION_ID}' created.` });
    } catch (err) {
        if (err.name === 'ResourceAlreadyExistsException') {
            return res.json({ success: true, message: `Collection '${COLLECTION_ID}' already exists.` });
        }
        throw err;
    }
}
