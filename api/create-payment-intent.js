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

    const apiKey = process.env.STRIPE_SECRET_KEY || process.env.CHAVE_SECRETA_NOVA;
    if (!apiKey) {
        const envName = process.env.VERCEL_ENV || 'unknown';
        const projName = process.env.VERCEL_PROJECT_NAME || 'unknown';
        console.error(`[${envName}][${projName}] STRIPE keys missing!`);

        // DEBUG: Return available keys to help user/admin diagnose
        const availableKeys = Object.keys(process.env).filter(key => !key.startsWith('npm_') && !key.startsWith('__'));

        return res.status(500).json({
            error: `[${envName}][${projName}] Configuration Error: Keys missing.`,
            debug_available_env_vars: availableKeys,
            debug_metadata: {
                project_name: process.env.VERCEL_PROJECT_NAME,
                environment: process.env.VERCEL_ENV,
                commit_message: process.env.VERCEL_GIT_COMMIT_MESSAGE,
                commit_sha: process.env.VERCEL_GIT_COMMIT_SHA
            }
        });
    }

    try {
        // Initialize Stripe lazily to avoid startup crashes if key is missing
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
