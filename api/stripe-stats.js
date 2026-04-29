import Stripe from 'stripe';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

    const stripeKey = (process.env.STRIPE_SECRET_KEY || process.env.CHAVE_SECRETA_NOVA || '').trim();
    if (!stripeKey) {
        return res.status(500).json({ error: 'Erro de configuração: chave de pagamento ausente.' });
    }

    try {
        const stripe = new Stripe(stripeKey);

        // 1. Get Balance (Available / Pending)
        const balance = await stripe.balance.retrieve();

        // 2. Get Recent Charges (including fees and status)
        const charges = await stripe.charges.list({
            limit: 20,
            expand: ['data.balance_transaction']
        });

        // 3. Calculate an average fee percentage from recent transactions (just for display)
        let avgFeePercent = 0;
        let feeCount = 0;
        charges.data.forEach(charge => {
            if (charge.balance_transaction && typeof charge.balance_transaction !== 'string') {
                const bt = charge.balance_transaction;
                if (bt.fee > 0 && bt.amount > 0) {
                    const feePercent = (bt.fee / bt.amount) * 100;
                    avgFeePercent += feePercent;
                    feeCount++;
                }
            }
        });
        const estimatedFeeRate = feeCount > 0 ? (avgFeePercent / feeCount).toFixed(2) : "3.99";

        return res.status(200).json({
            available: balance.available,
            pending: balance.pending,
            history: charges.data.map(c => ({
                id: c.id,
                paymentIntentId: c.payment_intent,
                amount: c.amount,
                amount_refunded: c.amount_refunded,
                status: c.status,
                refunded: c.refunded,
                date: c.created * 1000,
                customer_email: c.billing_details?.email || 'N/A',
                fee: typeof c.balance_transaction === 'object' ? c.balance_transaction?.fee : null,
                net: typeof c.balance_transaction === 'object' ? c.balance_transaction?.net : null,
            })),
            estimatedFeeRate
        });

    } catch (error) {
        console.error('[StripeStats] Erro:', error);
        return res.status(500).json({ error: 'Erro ao buscar dados do Stripe.' });
    }
}
