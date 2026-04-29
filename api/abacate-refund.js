import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    const { id, billing_id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Campo "id" é obrigatório.' });

    const apiKey = process.env.ABACATEPAY_API_KEY;
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // Verify billing exists and is PAID
        const { data: billing, error: fetchError } = await supabase
            .from('abacate_pay_billings')
            .select('id, billing_id, status, amount')
            .eq('id', id)
            .single();

        if (fetchError || !billing) {
            return res.status(404).json({ error: 'Cobrança não encontrada.' });
        }

        if (billing.status !== 'PAID') {
            return res.status(400).json({ error: 'Apenas cobranças com status PAID podem ser estornadas.' });
        }

        // Best-effort: try to notify AbacatePay refund endpoint
        const targetBillingId = billing_id || billing.billing_id;
        if (apiKey && targetBillingId) {
            try {
                const abacateRes = await fetch(
                    `https://api.abacatepay.com/v1/billing/${targetBillingId}/refund`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
                if (!abacateRes.ok) {
                    const txt = await abacateRes.text().catch(() => '');
                    console.warn('[AbacateRefund] API retornou erro (continuando com update local):', abacateRes.status, txt);
                }
            } catch (apiErr) {
                console.warn('[AbacateRefund] Falha ao contatar API AbacatePay (atualizando DB local):', apiErr.message);
            }
        }

        // Update status in our DB
        const { error: updateError } = await supabase
            .from('abacate_pay_billings')
            .update({ status: 'REFUNDED' })
            .eq('id', id);

        if (updateError) throw updateError;

        console.log('[AbacateRefund] Estorno registrado para billing id:', id);
        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('[AbacateRefund] Erro:', error);
        return res.status(500).json({ error: 'Erro ao processar estorno.' });
    }
}
