import { createClient } from '@supabase/supabase-js';

export const config = {
    api: { bodyParser: { sizeLimit: '15mb' } },
};

export default async function handler(req, res) {
    // 1. GET requests return Rekognition stats and costs (consolidated from rekognition-stats.js)
    if (req.method === 'GET' || req.query.action === 'stats' || req.body?.action === 'stats') {
        return await handleRekognitionStats(req, res);
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action } = req.body || {};

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
            DetectFacesCommand,
            DetectLabelsCommand,
            DetectTextCommand,
        } = await import('@aws-sdk/client-rekognition');

        const COLLECTION_ID = process.env.AWS_REKOGNITION_COLLECTION_ID || 'fotoclic-faces';
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
        if (action === 'indexFaces' || action === 'deleteFaces' || action === 'createCollection' || action === 'reindexVisualBatch') {
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

        if (action === 'indexFaces')      return await handleIndexFaces(req, res, rekognition, COLLECTION_ID, supabase, IndexFacesCommand, DetectLabelsCommand, DetectTextCommand);
        if (action === 'searchFaces')     return await handleSearchFaces(req, res, rekognition, COLLECTION_ID, supabase, SearchFacesByImageCommand, DetectFacesCommand, DetectLabelsCommand, DetectTextCommand);
        if (action === 'deleteFaces')     return await handleDeleteFaces(req, res, rekognition, COLLECTION_ID, DeleteFacesCommand);
        if (action === 'createCollection') return await handleCreateCollection(req, res, rekognition, COLLECTION_ID, CreateCollectionCommand);
        if (action === 'generate-description') return await handleGenerateDescription(req, res);

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

async function handleIndexFaces(req, res, rekognition, COLLECTION_ID, supabase, IndexFacesCommand, DetectLabelsCommand, DetectTextCommand) {
    const { photoId, imageBase64 } = req.body;
    if (!photoId || !imageBase64) return res.status(400).json({ error: 'photoId and imageBase64 are required' });

    const base64Data   = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer  = Buffer.from(base64Data, 'base64');

    // 1. Indexação Biométrica Facial
    let faceRecords = [];
    try {
        const faceResult = await rekognition.send(new IndexFacesCommand({
            CollectionId: COLLECTION_ID, 
            Image: { Bytes: imageBuffer },
            ExternalImageId: photoId, 
            DetectionAttributes: [], 
            MaxFaces: 20, 
            QualityFilter: 'AUTO',
        }));
        faceRecords = faceResult.FaceRecords || [];
    } catch (faceErr) {
        console.warn('[Rekognition] IndexFaces warning:', faceErr.message);
    }

    // 2. Extração Visual (Labels, Equipamentos, Cores para Surfe/Esportes)
    let visualLabels = [];
    if (DetectLabelsCommand) {
        try {
            const labelResult = await rekognition.send(new DetectLabelsCommand({
                Image: { Bytes: imageBuffer },
                MaxLabels: 20,
                MinConfidence: 65,
            }));
            visualLabels = (labelResult.Labels || []).map(l => ({
                Name: l.Name,
                Confidence: Math.round(l.Confidence),
                Categories: l.Categories?.map(c => c.Name) || [],
            }));
        } catch (labelErr) {
            console.warn('[Rekognition] DetectLabels warning:', labelErr.message);
        }
    }

    // 3. Extração OCR (Lycras de Competição, Numerais de Peito, etc)
    let detectedNumbers = [];
    if (DetectTextCommand) {
        try {
            const textResult = await rekognition.send(new DetectTextCommand({
                Image: { Bytes: imageBuffer },
            }));
            const detectedDetections = textResult.TextDetections || [];
            const numbersSet = new Set();
            for (const item of detectedDetections) {
                if (item.Type === 'LINE' || item.Type === 'WORD') {
                    const text = (item.DetectedText || '').trim();
                    // Extrair números (ex: "12", "07", "#45")
                    const matches = text.match(/\b\d{1,4}\b/g);
                    if (matches) {
                        matches.forEach(m => numbersSet.add(m));
                    }
                }
            }
            detectedNumbers = Array.from(numbersSet);
        } catch (textErr) {
            console.warn('[Rekognition] DetectText warning:', textErr.message);
        }
    }

    // Gravação das codificações faciais
    if (faceRecords.length > 0) {
        await supabase.from('face_encodings').delete().eq('photo_id', photoId);
        await supabase.from('face_encodings').insert(
            faceRecords.map((rec, idx) => ({
                photo_id: photoId, 
                face_index: idx,
                rekognition_face_id: rec.Face.FaceId, 
                model_version: 'rekognition-v1',
            }))
        );
    }

    // Atualização dos metadados da foto no Supabase
    const updatePayload = {
        is_face_indexed: true,
        is_ai_indexed: true,
    };
    if (visualLabels.length > 0) updatePayload.visual_labels = visualLabels;
    if (detectedNumbers.length > 0) updatePayload.detected_numbers = detectedNumbers;

    await supabase.from('photos').update(updatePayload).eq('id', photoId);

    return res.json({ 
        success: true, 
        facesIndexed: faceRecords.length,
        visualLabelsCount: visualLabels.length,
        detectedNumbers,
    });
}

async function handleSearchFaces(req, res, rekognition, COLLECTION_ID, supabase, SearchFacesByImageCommand, DetectFacesCommand, DetectLabelsCommand, DetectTextCommand) {
    const { imageBase64, eventId } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

    const base64Data  = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const matchesMap = new Map(); // photoId -> match object

    // 1. Verificar qualidade do rosto na foto de busca (DetectFaces)
    let isFaceReliable = false;
    let detectedFaces = [];
    if (DetectFacesCommand) {
        try {
            const dfRes = await rekognition.send(new DetectFacesCommand({
                Image: { Bytes: imageBuffer },
                Attributes: ['ALL'],
            }));
            detectedFaces = dfRes.FaceDetails || [];
            if (detectedFaces.length > 0) {
                const primaryFace = detectedFaces[0];
                const width = primaryFace.BoundingBox?.Width || 0;
                const height = primaryFace.BoundingBox?.Height || 0;
                const yaw = Math.abs(primaryFace.Pose?.Yaw || 0);
                // Rosto precisa ter tamanho razoável (> 7% da foto) e não estar em perfil extremo (> 40 graus)
                if (width >= 0.07 && height >= 0.07 && yaw <= 40 && primaryFace.Confidence >= 80) {
                    isFaceReliable = true;
                }
            }
        } catch (dfErr) {
            console.log('[Rekognition] DetectFaces check:', dfErr.message);
        }
    } else {
        isFaceReliable = true;
    }

    // 2. Motor Facial (Biometria - apenas se o rosto for nítido/confiável)
    let faceMatches = [];
    if (isFaceReliable) {
        try {
            const faceResult = await rekognition.send(new SearchFacesByImageCommand({
                CollectionId: COLLECTION_ID, 
                Image: { Bytes: imageBuffer },
                MaxFaces: 100, 
                FaceMatchThreshold: 85,
            }));
            faceMatches = faceResult.FaceMatches || [];
            for (const m of faceMatches) {
                const pid = m.Face.ExternalImageId;
                if (pid) {
                    matchesMap.set(pid, {
                        photoId: pid,
                        faceId: m.Face.FaceId,
                        similarity: m.Similarity,
                        confidence: m.Face.Confidence,
                        matchType: 'face',
                        matchReasons: ['🎯 Rosto Reconhecido'],
                    });
                }
            }
        } catch (faceErr) {
            console.log('[Rekognition] Face search info:', faceErr.message);
        }
    }

    // 3. Filtrar correspondências faciais pelo eventId se fornecido
    if (eventId && matchesMap.size > 0) {
        const photoIdsToCheck = Array.from(matchesMap.keys());
        const { data: validEventPhotos } = await supabase
            .from('photos')
            .select('id')
            .eq('event_id', eventId)
            .in('id', photoIdsToCheck);

        const validIds = new Set((validEventPhotos || []).map(p => p.id));
        for (const pid of photoIdsToCheck) {
            if (!validIds.has(pid)) {
                matchesMap.delete(pid);
            }
        }
    }

    // 4. Motor Visual & OCR na foto enviada pelo usuário
    let searchLabels = [];
    let searchNumbers = [];

    // Extrair equipamentos e contexto esportivo
    if (DetectLabelsCommand) {
        try {
            const labelRes = await rekognition.send(new DetectLabelsCommand({
                Image: { Bytes: imageBuffer },
                MaxLabels: 20,
                MinConfidence: 55,
            }));
            const relevantSportsLabels = [
                'Surfboard', 'Surfing', 'Wetsuit', 'Water Sports', 'Boardsport', 'Sea Waves', 'Ocean',
                'Bicycle', 'Cycling', 'Helmet', 'Vehicle', 'Sportswear', 'Lifejacket', 'Swimwear',
                'Skateboard', 'Motorcycle', 'Running', 'Athletics'
            ];
            searchLabels = (labelRes.Labels || [])
                .filter(l => relevantSportsLabels.some(r => l.Name.toLowerCase().includes(r.toLowerCase())))
                .map(l => l.Name);
        } catch (lErr) {
            console.warn('[Rekognition] Search DetectLabels error:', lErr.message);
        }
    }

    // Extrair numerais da lycra/roupa
    if (DetectTextCommand) {
        try {
            const textRes = await rekognition.send(new DetectTextCommand({
                Image: { Bytes: imageBuffer },
            }));
            const detected = textRes.TextDetections || [];
            const nums = new Set();
            for (const item of detected) {
                const text = (item.DetectedText || '').trim();
                const m = text.match(/\b\d{1,4}\b/g);
                if (m) m.forEach(n => nums.add(n));
            }
            searchNumbers = Array.from(nums);
        } catch (tErr) {
            console.warn('[Rekognition] Search DetectText error:', tErr.message);
        }
    }

    // 5. Cruzamento Visual Inteligente no Banco de Dados (JSONB Contains & OCR Overlaps)
    if (searchNumbers.length > 0 || searchLabels.length > 0) {
        try {
            const visualPhotosMap = new Map();

            // A. Busca por Numerais de Lycra/Roupa
            if (searchNumbers.length > 0) {
                let qNums = supabase.from('photos').select('id, event_id, visual_labels, detected_numbers');
                if (eventId) qNums = qNums.eq('event_id', eventId);
                qNums = qNums.overlaps('detected_numbers', searchNumbers);
                const { data: numPhotos } = await qNums.limit(100);
                (numPhotos || []).forEach(p => visualPhotosMap.set(p.id, p));
            }

            // B. Busca por Etiquetas Visuais (Prancha, Wetsuit, Surfe, Ciclismo, etc)
            for (const label of searchLabels.slice(0, 4)) {
                let qLabels = supabase.from('photos').select('id, event_id, visual_labels, detected_numbers');
                if (eventId) qLabels = qLabels.eq('event_id', eventId);
                qLabels = qLabels.contains('visual_labels', JSON.stringify([{ Name: label }]));
                const { data: lblPhotos } = await qLabels.limit(80);
                (lblPhotos || []).forEach(p => visualPhotosMap.set(p.id, p));
            }

            const visualPhotos = Array.from(visualPhotosMap.values());

            if (visualPhotos && visualPhotos.length > 0) {
                for (const p of visualPhotos) {
                    const pid = p.id;
                    const existing = matchesMap.get(pid);
                    const matchedNums = (p.detected_numbers || []).filter(n => searchNumbers.includes(n));
                    
                    const photoLabels = (p.visual_labels || []).map(l => (typeof l === 'string' ? l : l.Name));
                    const matchedLabels = searchLabels.filter(sl => photoLabels.includes(sl));

                    if (matchedNums.length === 0 && matchedLabels.length === 0 && searchLabels.length > 0) {
                        continue;
                    }

                    if (existing) {
                        // Foto tem tanto rosto quanto equipamento/número!
                        existing.similarity = Math.min(99.9, existing.similarity + 10);
                        existing.matchType = 'hybrid';
                        if (matchedNums.length > 0) existing.matchReasons.push(`🔢 Lycra #${matchedNums.join(', #')}`);
                        if (matchedLabels.length > 0) existing.matchReasons.push(`🏄 ${matchedLabels.slice(0, 2).join(', ')}`);
                    } else if (matchedNums.length > 0 || matchedLabels.length > 0) {
                        // Foto de ação (sem rosto claro, mas com mesmo esporte/equipamento/número)
                        const reasons = [];
                        let score = 65;
                        if (matchedNums.length > 0) {
                            reasons.push(`🔢 Lycra #${matchedNums.join(', #')}`);
                            score += 25;
                        }
                        if (matchedLabels.length > 0) {
                            reasons.push(`🏄 ${matchedLabels.slice(0, 2).join(', ')}`);
                            score += Math.min(20, matchedLabels.length * 7);
                        }
                        matchesMap.set(pid, {
                            photoId: pid,
                            faceId: null,
                            similarity: score,
                            confidence: score,
                            matchType: matchedNums.length > 0 ? 'number' : 'visual',
                            matchReasons: reasons,
                        });
                    }
                }
            }
        } catch (dbErr) {
            console.warn('[Rekognition] Hybrid DB query error:', dbErr.message);
        }
    }

    // Ordenar resultados pelo maior score de relevância
    const sortedMatches = Array.from(matchesMap.values()).sort((a, b) => b.similarity - a.similarity);

    return res.json({
        success:    true,
        photoIds:   sortedMatches.map(m => m.photoId),
        matches:    sortedMatches,
        detectedInQuery: {
            facesFound: faceMatches.length,
            labels: searchLabels,
            numbers: searchNumbers,
        }
    });
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

async function handleRekognitionStats(req, res) {
    try {
        const { RekognitionClient, DescribeCollectionCommand } = await import('@aws-sdk/client-rekognition');
        const COLLECTION_ID = process.env.AWS_REKOGNITION_COLLECTION_ID || 'fotoclic-faces';
        const region = process.env.AWS_REGION || 'us-east-1';
        const credentials = {
            accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };

        const rekognition = new RekognitionClient({ region, credentials });
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        let collectionInfo = { faceCount: 0, faceModelVersion: '-' };
        try {
            const desc = await rekognition.send(new DescribeCollectionCommand({ CollectionId: COLLECTION_ID }));
            collectionInfo = {
                faceCount: desc.FaceCount ?? 0,
                faceModelVersion: desc.FaceModelVersion ?? '-',
            };
        } catch (e) {
            console.warn('DescribeCollection failed:', e.message);
        }

        const [{ count: totalPhotos }, { count: indexedPhotos }, { count: totalEncodings }] = await Promise.all([
            supabase.from('photos').select('*', { count: 'exact', head: true }),
            supabase.from('photos').select('*', { count: 'exact', head: true }).eq('is_face_indexed', true),
            supabase.from('face_encodings').select('*', { count: 'exact', head: true }).eq('model_version', 'rekognition-v1'),
        ]);

        const storageCostPerMonth = collectionInfo.faceCount * 0.00001;
        const estimatedIndexCost  = (indexedPhotos ?? 0) * 0.001;
        const estimatedTotalCost  = storageCostPerMonth + estimatedIndexCost;

        return res.json({
            collection: {
                id: COLLECTION_ID,
                faceCount: collectionInfo.faceCount,
                faceModelVersion: collectionInfo.faceModelVersion,
            },
            database: {
                totalPhotos: totalPhotos ?? 0,
                indexedPhotos: indexedPhotos ?? 0,
                totalEncodings: totalEncodings ?? 0,
            },
            cost: {
                storageCostPerMonth: parseFloat(storageCostPerMonth.toFixed(4)),
                estimatedIndexCost: parseFloat(estimatedIndexCost.toFixed(4)),
                estimatedTotalCost: parseFloat(estimatedTotalCost.toFixed(4)),
                realCostThisMonth: null,
            },
            pricing: {
                storagePerFacePerMonth: 0.00001,
                indexFacesPerImage: 0.001,
                searchPerCall: 0.001,
                freeTierMonthly: 5000,
                currency: 'USD',
            },
        });
    } catch (error) {
        console.error('[rekognition-stats-handler]', error);
        return res.status(500).json({ error: error.message });
    }
}

async function handleGenerateDescription(req, res) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Configuração GEMINI_API_KEY ausente.' });
    }
    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const { prompt } = req.body || {};
        if (!prompt) return res.status(400).json({ error: 'Prompt é obrigatório.' });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return res.status(200).json({ text: response.text() });
    } catch (error) {
        console.error('[GenerateDescription]', error);
        return res.status(500).json({ error: 'Falha ao gerar descrição com IA.', details: error.message });
    }
}
