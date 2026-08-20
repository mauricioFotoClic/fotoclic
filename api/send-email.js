
import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
    // Add CORS headers
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    const origin = request.headers.origin;
    const allowedOrigins = [
        'https://www.fotoclic.com.br',
        'https://fotoclic.com.br',
        'http://localhost:5173',
        'http://localhost:3000'
    ];
    if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app'))) {
        response.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        response.setHeader('Access-Control-Allow-Origin', 'https://www.fotoclic.com.br');
    }
    response.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    // --- Autenticação Obrigatória ---
    const authHeader = request.headers.authorization || '';
    const userJwt = authHeader.replace('Bearer ', '').trim();

    if (!userJwt) {
        return response.status(401).json({ error: 'Não autorizado. Autenticação obrigatória para envio de e-mails.' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return response.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(userJwt);

    if (authError || !user) {
        return response.status(401).json({ error: 'Token de autenticação inválido ou expirado.' });
    }

    const { to, subject, html } = request.body;

    if (!to || !subject || !html) {
        return response.status(400).json({ error: 'Missing required fields' });
    }

    const LOCAWEB_SMTP_TOKEN = process.env.LOCAWEB_SMTP_TOKEN;

    if (!LOCAWEB_SMTP_TOKEN) {
        console.error('LOCAWEB_SMTP_TOKEN is missing');
        return response.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const res = await fetch('https://api.smtplw.com.br/v1/messages', {
            method: 'POST',
            headers: {
                'x-auth-token': LOCAWEB_SMTP_TOKEN,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'nao-responda@email.fotoclic.com.br', // Authenticated subdomain
                to: Array.isArray(to) ? to : [to],
                subject: subject,
                body: html,
            }),
        });

        const data = res.headers.get('content-type')?.includes('application/json')
            ? await res.json()
            : { message: await res.text() };

        if (!res.ok) {
            console.error('Locaweb SMTP API error:', data);
            return response.status(res.status).json(data);
        }

        return response.status(200).json(data);
    } catch (error) {
        console.error('Failed to send email via Locaweb:', error);
        return response.status(500).json({ error: 'Failed to send email' });
    }
}
