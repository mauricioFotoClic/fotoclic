import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'fotoclic-media-storage';
const REGION = process.env.AWS_REGION || 'us-east-1';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      fileName, 
      fileType, 
      folder = 'previews', // 'previews' | 'thumbs' | 'originals'
      photographerId, 
      eventId,
      action = 'getUploadUrl' // 'getUploadUrl' | 'getDownloadUrl'
    } = req.body;

    if (!fileName || !photographerId || !eventId) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes (fileName, photographerId, eventId).' });
    }

    // Sanitizar caminhos
    const cleanPhotographerId = String(photographerId).replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanEventId = String(eventId).replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanFileName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '');

    const key = `${folder}/${cleanPhotographerId}/${cleanEventId}/${cleanFileName}`;

    if (action === 'getDownloadUrl') {
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      // URL de download temporária válida por 2 horas
      const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 7200 });
      return res.status(200).json({ downloadUrl, key });
    }

    // Gera URL de upload direto (PUT) válida por 15 minutos
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType || 'image/jpeg',
    });

    const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 900 });
    const publicUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;

    return res.status(200).json({
      uploadUrl,
      publicUrl,
      s3Key: key,
      bucket: BUCKET_NAME,
      region: REGION
    });
  } catch (err) {
    console.error('[S3 Presigned URL Error]:', err);
    return res.status(500).json({ error: err.message || 'Erro ao gerar URL do S3' });
  }
}
