
export default async function handler(request, response) {
    // Add CORS headers
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { to, subject, html } = request.body;

    if (!to || !subject || !html) {
        return response.status(400).json({ error: 'Missing required fields' });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY is missing');
        return response.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'onboarding@resend.dev', // Or your verified domain
                to: to,
                subject: subject,
                html: html,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('Resend API error:', data);
            return response.status(res.status).json(data);
        }

        return response.status(200).json(data);
    } catch (error) {
        console.error('Failed to send email:', error);
        return response.status(500).json({ error: 'Failed to send email' });
    }
}
