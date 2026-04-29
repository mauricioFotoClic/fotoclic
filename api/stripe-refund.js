import Stripe from 'stripe';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    const stripeKey = (process.env.STRIPE_SECRET_KEY || process.env.CHAVE_SECRETA_NOVA || '').trim();
    if (!stripeKey) {
        return res.status(500).json({ error: 'Erro de configuração.' });
    }

    try {
        const { chargeId, amount } = req.body;
        if (!chargeId) return res.status(400).json({ error: 'ID da transação ausente.' });

        const stripe = new Stripe(stripeKey);

        const refund = await stripe.refunds.create({
            charge: chargeId,
            amount: amount || undefined, // If amount is null, refunds full amount
        });

        return res.status(200).json({
            success: true,
            refundId: refund.id,
            status: refund.status
        });

    } catch (error) {
        console.error('[StripeRefund] Erro:', error);
        return res.status(500).json({ error: error.message || 'Erro ao realizar reembolso.' });
    }
}
