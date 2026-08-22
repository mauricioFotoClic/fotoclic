import { generateAndSendDailySummary } from '../lib/daily-summary-service.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const result = await generateAndSendDailySummary();
    return res.status(200).json(result);
  } catch (err) {
    console.error('[API daily-summary Error]:', err);
    return res.status(500).json({ error: err.message });
  }
}
