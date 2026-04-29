import { createClient } from '@supabase/supabase-js';

function emptyStats() {
    return {
        total_paid: 0,
        total_pix: 0,
        total_card: 0,
        paid_count: 0,
        pending_count: 0,
        pending_amount: 0,
        cancelled_count: 0,
        refunded_count: 0,
        refunded_amount: 0,
        balance: 0,
    };
}

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const { data: billings, error } = await supabase
            .from('abacate_pay_billings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) {
            if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
                return res.status(200).json({ billings: [], stats: emptyStats() });
            }
            throw error;
        }

        const paid      = billings.filter(b => b.status === 'PAID');
        const pending   = billings.filter(b => b.status === 'PENDING');
        const cancelled = billings.filter(b => b.status === 'CANCELLED');
        const refunded  = billings.filter(b => b.status === 'REFUNDED');

        const totalPaid     = paid.reduce((s, b) => s + (b.amount || 0), 0);
        const totalPending  = pending.reduce((s, b) => s + (b.amount || 0), 0);
        const totalRefunded = refunded.reduce((s, b) => s + (b.amount || 0), 0);

        // payment_method column (populated by webhook when billing is paid)
        const totalPix  = paid.filter(b => b.payment_method === 'PIX').reduce((s, b) => s + (b.amount || 0), 0);
        const totalCard = paid.filter(b => b.payment_method === 'CARD').reduce((s, b) => s + (b.amount || 0), 0);

        return res.status(200).json({
            billings,
            stats: {
                total_paid:      totalPaid,
                total_pix:       totalPix,
                total_card:      totalCard,
                paid_count:      paid.length,
                pending_count:   pending.length,
                pending_amount:  totalPending,
                cancelled_count: cancelled.length,
                refunded_count:  refunded.length,
                refunded_amount: totalRefunded,
                balance: Math.max(0, (totalPaid - totalRefunded) * 0.97),
            },
        });

    } catch (error) {
        console.error('[AbacateStats] Erro:', error);
        return res.status(500).json({ error: 'Erro ao buscar estatísticas da Abacate Pay.' });
    }
}
