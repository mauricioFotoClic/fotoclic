import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Gera um UUID único conforme exigido pela especificação da Appmax
  const externalId = crypto.randomUUID ? crypto.randomUUID() : 'fotoclic-' + Date.now();

  return res.status(200).json({
    status: 'healthy',
    platform: 'FotoClic',
    external_id: externalId,
    timestamp: new Date().toISOString()
  });
}
