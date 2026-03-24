import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    // --- Validate environment ---
    const stripeKey = (process.env.STRIPE_SECRET_KEY || process.env.CHAVE_SECRETA_NOVA || '').trim();
    if (!stripeKey) {
        console.error('[PaymentIntent] STRIPE_SECRET_KEY ausente.');
        return res.status(500).json({ error: 'Erro de configuração: chave de pagamento ausente.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    // Prefer service role key (bypasses RLS safely on server), fallback to anon key
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
        console.error('[PaymentIntent] Supabase credentials ausentes.');
        return res.status(500).json({ error: 'Erro de configuração: credenciais do banco ausentes.' });
    }

    try {
        const { items, couponCode, currency = 'brl' } = req.body;

        // --- Validate input ---
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Nenhum item informado no carrinho.' });
        }
        if (items.length > 50) {
            return res.status(400).json({ error: 'Quantidade máxima de itens excedida.' });
        }

        // Reject any non-UUID to prevent injection attacks
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!items.every(id => typeof id === 'string' && uuidRegex.test(id))) {
            return res.status(400).json({ error: 'IDs de itens inválidos.' });
        }

        // --- Fetch real prices from database (never trust the client) ---
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: photos, error: photosError } = await supabase
            .from('photos')
            .select('id, price, photographer_id, moderation_status')
            .in('id', items)
            .eq('moderation_status', 'approved');

        if (photosError) {
            console.error('[PaymentIntent] Erro ao consultar fotos:', photosError.message);
            return res.status(500).json({ error: 'Erro ao consultar itens no banco.' });
        }

        // All requested photos must exist and be approved
        if (!photos || photos.length !== items.length) {
            return res.status(400).json({ error: 'Um ou mais itens não estão disponíveis para compra.' });
        }

        // --- Calculate total server-side ---
        const subtotal = photos.reduce((acc, p) => acc + Number(p.price), 0);
        let totalDiscount = 0;

        // Validate and apply coupon discount
        if (couponCode && typeof couponCode === 'string' && couponCode.trim().length > 0) {
            const { data: coupon } = await supabase
                .from('coupons')
                .select('photographer_id, discount_percent, expiration_date, is_active')
                .eq('code', couponCode.trim().toUpperCase())
                .eq('is_active', true)
                .gt('expiration_date', new Date().toISOString())
                .maybeSingle();

            if (coupon) {
                const couponPhotosSubtotal = photos
                    .filter(p => p.photographer_id === coupon.photographer_id)
                    .reduce((acc, p) => acc + Number(p.price), 0);
                totalDiscount += couponPhotosSubtotal * (coupon.discount_percent / 100);
            }
        }

        // Apply bulk discounts per photographer group
        const photographerGroups = {};
        photos.forEach(p => {
            if (!photographerGroups[p.photographer_id]) photographerGroups[p.photographer_id] = [];
            photographerGroups[p.photographer_id].push(p);
        });

        const photographerIds = Object.keys(photographerGroups);
        if (photographerIds.length > 0) {
            const { data: photographers } = await supabase
                .from('users')
                .select('id, bulk_discount_rules')
                .in('id', photographerIds);

            if (photographers) {
                for (const photographer of photographers) {
                    const rules = photographer.bulk_discount_rules;
                    if (!Array.isArray(rules) || rules.length === 0) continue;

                    const groupPhotos = photographerGroups[photographer.id];
                    const sortedRules = [...rules].sort((a, b) => b.minQuantity - a.minQuantity);
                    const appliedRule = sortedRules.find(r => groupPhotos.length >= r.minQuantity);

                    if (appliedRule) {
                        const groupSubtotal = groupPhotos.reduce((acc, p) => acc + Number(p.price), 0);
                        totalDiscount += groupSubtotal * (appliedRule.discountPercent / 100);
                    }
                }
            }
        }

        const total = Math.max(0, subtotal - totalDiscount);

        // Stripe minimum is R$0,50
        if (total < 0.5) {
            return res.status(400).json({ error: 'Valor mínimo para pagamento é R$ 0,50.' });
        }

        const amountInCents = Math.round(total * 100);

        console.log(`[PaymentIntent] items=${items.length} subtotal=${subtotal} discount=${totalDiscount} total=${total} cents=${amountInCents}`);

        // --- Create PaymentIntent with server-calculated amount ---
        const stripe = new Stripe(stripeKey);
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency,
            automatic_payment_methods: { enabled: true },
            metadata: {
                photo_ids: items.join(','),
                coupon_code: couponCode || '',
            },
        });

        return res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            calculatedAmount: total, // Return for frontend display verification
        });

    } catch (error) {
        console.error('[PaymentIntent] Erro interno:', error);
        return res.status(500).json({ error: 'Erro interno ao processar pagamento.' });
    }
}
