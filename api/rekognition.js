import { createClient } from '@supabase/supabase-js';

export const config = {
    api: { bodyParser: { sizeLimit: '15mb' } },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action } = req.body;

    // Healthcheck: runs before any AWS import so we can diagnose loading issues
    if (action === 'healthcheck') {
        let sdkOk = false;
        let sdkError = null;
        try {
            await import('@aws-sdk/client-rekognition');
            sdkOk = true;
        } catch (e) {
            sdkError = e.message;
        }
        return res.json({
            ok: true,
            hasAccessKey:  !!process.env.AWS_ACCESS_KEY_ID,
            hasSecretKey:  !!process.env.AWS_SECRET_ACCESS_KEY,
            region:        process.env.AWS_REGION,
            collection:    process.env.AWS_REKOGNITION_COLLECTION_ID,
            nodeVersion:   process.version,
            sdkLoaded:     sdkOk,
            sdkError,
        });
    }

    try {
        // Dynamic import: avoids module-level crash if SDK has env issues
        const {
            RekognitionClient,
            IndexFacesCommand,
            SearchFacesByImageCommand,
            DeleteFacesCommand,
            CreateCollectionCommand,
        } = await import('@aws-sdk/client-rekognition');

        const rekognition = new RekognitionClient({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Configuração do Supabase ausente.' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Ações restritas exigem autenticação
        if (action === 'indexFaces' || action === 'deleteFaces' || action === 'createCollection') {
            const authHeader = req.headers.authorization || '';
            const userJwt = authHeader.replace('Bearer ', '').trim();

            if (!userJwt) {
                return res.status(401).json({ error: 'Não autorizado. Autenticação obrigatória.' });
            }

            const { data: { user }, error: authError } = await supabase.auth.getUser(userJwt);
            if (authError || !user) {
                return res.status(401).json({ error: 'Token de autenticação inválido ou expirado.' });
            }

            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();

            const isPhotographerOrAdmin = profile?.role === 'photographer' || profile?.role === 'admin' || user.user_metadata?.role === 'photographer' || user.user_metadata?.role === 'admin';

            if (!isPhotographerOrAdmin) {
                return res.status(403).json({ error: 'Acesso negado. Apenas fotógrafos e administradores podem executar esta ação.' });
            }

            if (action === 'createCollection' && profile?.role !== 'admin' && user.user_metadata?.role !== 'admin') {
                return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerenciar coleções.' });
            }
        }

        if (action === 'indexFaces')      return await handleIndexFaces(req, res, rekognition, COLLECTION_ID, supabase, IndexFacesCommand);
        if (action === 'searchFaces')     return await handleSearchFaces(req, res, rekognition, COLLECTION_ID, SearchFacesByImageCommand);
        if (action === 'deleteFaces')     return await handleDeleteFaces(req, res, rekognition, COLLECTION_ID, DeleteFacesCommand);
        if (action === 'createCollection') return await handleCreateCollection(req, res, rekognition, COLLECTION_ID, CreateCollectionCommand);

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
        console.error('[Rekognition] Error:', error);
        return res.status(500).json({
            error: error.message || 'Unknown error',
            name:  error.name,
            action,
        });
    }
}

async function handleIndexFaces(req, res, rekognition, COLLECTION_ID, supabase, IndexFacesCommand) {
    const { photoId, imageBase64 } = req.body;
    if (!photoId || !imageBase64) return res.status(400).json({ error: 'photoId and imageBase64 are required' });

    const base64Data   = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer  = Buffer.from(base64Data, 'base64');

    const result       = await rekognition.send(new IndexFacesCommand({
        CollectionId: COLLECTION_ID, Image: { Bytes: imageBuffer },
        ExternalImageId: photoId, DetectionAttributes: [], MaxFaces: 20, QualityFilter: 'AUTO',
    }));
    const faceRecords  = result.FaceRecords || [];

    if (faceRecords.length === 0) {
        await supabase.from('photos').update({ is_face_indexed: true }).eq('id', photoId);
        return res.json({ success: true, facesIndexed: 0 });
    }

    await supabase.from('face_encodings').delete().eq('photo_id', photoId);

    const { error } = await supabase.from('face_encodings').insert(
        faceRecords.map((rec, idx) => ({
            photo_id: photoId, face_index: idx,
            rekognition_face_id: rec.Face.FaceId, model_version: 'rekognition-v1',
        }))
    );
    if (error) throw error;

    await supabase.from('photos').update({ is_face_indexed: true }).eq('id', photoId);
    return res.json({ success: true, facesIndexed: faceRecords.length });
}

async function handleSearchFaces(req, res, rekognition, COLLECTION_ID, SearchFacesByImageCommand) {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

    const base64Data  = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const result      = await rekognition.send(new SearchFacesByImageCommand({
        CollectionId: COLLECTION_ID, Image: { Bytes: imageBuffer },
        MaxFaces: 100, FaceMatchThreshold: 80,
    }));
    const faceMatches = result.FaceMatches || [];

    return res.json({
        success:    true,
        photoIds:   [...new Set(faceMatches.map(m => m.Face.ExternalImageId))],
        matches:    faceMatches.map(m => ({
            photoId:    m.Face.ExternalImageId,
            faceId:     m.Face.FaceId,
            similarity: m.Similarity,
            confidence: m.Face.Confidence,
        })),
    });
}

async function handleDeleteFaces(req, res, rekognition, COLLECTION_ID, DeleteFacesCommand) {
    const { faceIds } = req.body;
    if (!faceIds?.length) return res.status(400).json({ error: 'faceIds array is required' });
    await rekognition.send(new DeleteFacesCommand({ CollectionId: COLLECTION_ID, FaceIds: faceIds }));
    return res.json({ success: true, deleted: faceIds.length });
}

async function handleCreateCollection(req, res, rekognition, COLLECTION_ID, CreateCollectionCommand) {
    try {
        await rekognition.send(new CreateCollectionCommand({ CollectionId: COLLECTION_ID }));
        return res.json({ success: true, message: `Collection '${COLLECTION_ID}' created.` });
    } catch (err) {
        if (err.name === 'ResourceAlreadyExistsException') {
            return res.json({ success: true, message: `Collection '${COLLECTION_ID}' already exists.` });
        }
        throw err;
    }
}
