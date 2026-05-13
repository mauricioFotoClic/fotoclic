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

        // Critical: call AbacatePay refund endpoint
        const targetBillingId = billing_id || billing.billing_id;
        if (!apiKey || !targetBillingId) {
            throw new Error('Configuração de API ou ID da cobrança ausente.');
        }

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
            
            const apiData = await abacateRes.json().catch(() => ({}));
            
            if (!abacateRes.ok) {
                const errorMessage = apiData.error || apiData.message || `Erro da API (${abacateRes.status})`;
                console.error('[AbacateRefund] Falha na API do AbacatePay:', apiData);
                throw new Error(`O Abacate Pay não processou o estorno: ${errorMessage}`);
            }
        } catch (apiErr) {
            console.error('[AbacateRefund] Erro na comunicação:', apiErr);
            throw apiErr;
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
