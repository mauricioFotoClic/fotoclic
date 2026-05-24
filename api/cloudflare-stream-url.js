export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = process.env;

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        return res.status(500).json({ error: 'Cloudflare credentials not configured in environment variables' });
    }

    const { creator_id, max_duration_seconds = 90 } = req.body;

    try {
        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                maxDurationSeconds: max_duration_seconds,
                creator: creator_id || 'unknown',
                requireSignedURLs: false // Publicly viewable by default
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[Cloudflare] Error creating direct upload:', data.errors);
            return res.status(response.status).json({ error: 'Failed to create upload URL', details: data.errors });
        }

        // Return the uploadURL and the uid to the client
        return res.status(200).json({
            uploadURL: data.result.uploadURL,
            uid: data.result.uid
        });

    } catch (error) {
        console.error('[Cloudflare] Internal error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
