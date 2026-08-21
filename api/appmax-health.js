import crypto from 'crypto';

/**
 * Endpoint de Validação / Health Check da Appmax para Instalação de Aplicativo
 * URL cadastrada: https://fotoclic.com.br/api/appmax-health
 * 
 * Contrato Appmax:
 * POST https://fotoclic.com.br/api/appmax-health
 * Payload recebido: { app_id: 123, client_id?: string, client_secret?: string, external_key?: string }
 * Resposta esperada: HTTP 200 com { external_id: "uuid-v4", alias?: "FotoClic" }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const externalId = crypto.randomUUID ? crypto.randomUUID() : 'fotoclic-' + Date.now();

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'FotoClic Appmax Health Validator',
      external_id: externalId,
      alias: 'FotoClic'
    });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    console.log('[Appmax Health Check] Payload recebido da Appmax:', JSON.stringify(body));

    // A Appmax envia app_id numérico, e opcionalmente client_id, client_secret, external_key
    const responseData = {
      external_id: externalId,
      alias: 'FotoClic',
      data: {
        external_id: externalId,
        alias: 'FotoClic'
      }
    };

    return res.status(200).json(responseData);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
