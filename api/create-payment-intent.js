import Stripe from 'stripe';

export default async function handler(req, res) {
    console.log("Create Payment Intent API called");

    // Add CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const rawApiKey = process.env.STRIPE_SECRET_KEY || process.env.CHAVE_SECRETA_NOVA;

    // Debug: Log key status (masked)
    if (rawApiKey) {
        console.log(`[Backend] Loading Stripe Key: ${rawApiKey.substring(0, 8)}... (Length: ${rawApiKey.length})`);
    } else {
        console.error("[Backend] CRITICAL: STRIPE_SECRET_KEY is missing in process.env");
    }

    if (!rawApiKey) {
        return res.status(500).json({ error: "Configuration Error: Payment gateway keys missing from server environment." });
    }

    const apiKey = rawApiKey.trim();

    try {
        // Initialize Stripe
        const stripe = new Stripe(apiKey);

        const { amount, currency = 'brl' } = req.body;
        console.log(`Creating PaymentIntent for amount: ${amount} ${currency} `);

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                items: JSON.stringify(req.body.items || []), // Store item IDs for reference
            }
        });

        console.log("PaymentIntent created:", paymentIntent.id);
        return res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Stripe error:', error);
        return res.status(500).json({ error: error.message });
    }
}
