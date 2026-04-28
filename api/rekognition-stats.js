import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { RekognitionClient, DescribeCollectionCommand } = await import('@aws-sdk/client-rekognition');
        const { CostExplorerClient, GetCostAndUsageCommand } = await import('@aws-sdk/client-cost-explorer');

        const COLLECTION_ID = process.env.AWS_REKOGNITION_COLLECTION_ID || 'fotoclic-faces';
        const region = process.env.AWS_REGION || 'us-east-1';
        const credentials = {
            accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };

        const rekognition = new RekognitionClient({ region, credentials });

        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 1. Collection info (face count, indexed size)
        let collectionInfo = { faceCount: 0, faceModelVersion: '-' };
        try {
            const desc = await rekognition.send(new DescribeCollectionCommand({ CollectionId: COLLECTION_ID }));
            collectionInfo = {
                faceCount:        desc.FaceCount ?? 0,
                faceModelVersion: desc.FaceModelVersion ?? '-',
            };
        } catch (e) {
            console.warn('DescribeCollection failed:', e.message);
        }

        // 2. Stats from Supabase
        const [{ count: totalPhotos }, { count: indexedPhotos }, { count: totalEncodings }] = await Promise.all([
            supabase.from('photos').select('*', { count: 'exact', head: true }),
            supabase.from('photos').select('*', { count: 'exact', head: true }).eq('is_face_indexed', true),
            supabase.from('face_encodings').select('*', { count: 'exact', head: true }).eq('model_version', 'rekognition-v1'),
        ]);

        // 3. Estimated cost (AWS Rekognition pricing — us-east-1)
        // Storage: $0.00001 per face/month
        // IndexFaces: $0.001 per image (after free tier of 5000/month for 12 months)
        // SearchFacesByImage: $0.001 per call
        const storageCostPerMonth = collectionInfo.faceCount * 0.00001;
        const estimatedIndexCost  = (indexedPhotos ?? 0) * 0.001;
        const estimatedTotalCost  = storageCostPerMonth + estimatedIndexCost;

        // 4. Real cost via AWS Cost Explorer (us-east-1 only, requires ce:GetCostAndUsage permission)
        let realCost = null;
        try {
            const ce = new CostExplorerClient({ region: 'us-east-1', credentials });
            const now   = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const end   = now.toISOString().split('T')[0];

            const ceResult = await ce.send(new GetCostAndUsageCommand({
                TimePeriod:  { Start: start, End: end },
                Granularity: 'MONTHLY',
                Filter:      { Dimensions: { Key: 'SERVICE', Values: ['Amazon Rekognition'] } },
                Metrics:     ['UnblendedCost'],
            }));

            const amount = ceResult.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount;
            if (amount !== undefined) realCost = parseFloat(amount);
        } catch (e) {
            // Cost Explorer permission not granted — estimated cost will be shown instead
            console.warn('Cost Explorer unavailable:', e.message);
        }

        return res.json({
            collection: {
                id:               COLLECTION_ID,
                faceCount:        collectionInfo.faceCount,
                faceModelVersion: collectionInfo.faceModelVersion,
            },
            database: {
                totalPhotos:    totalPhotos ?? 0,
                indexedPhotos:  indexedPhotos ?? 0,
                totalEncodings: totalEncodings ?? 0,
            },
            cost: {
                storageCostPerMonth:  parseFloat(storageCostPerMonth.toFixed(4)),
                estimatedIndexCost:   parseFloat(estimatedIndexCost.toFixed(4)),
                estimatedTotalCost:   parseFloat(estimatedTotalCost.toFixed(4)),
                realCostThisMonth:    realCost,
            },
            pricing: {
                storagePerFacePerMonth: 0.00001,
                indexFacesPerImage:     0.001,
                searchPerCall:          0.001,
                freeTierMonthly:        5000,
                currency:               'USD',
            },
        });

    } catch (error) {
        console.error('[rekognition-stats]', error);
        return res.status(500).json({ error: error.message });
    }
}
