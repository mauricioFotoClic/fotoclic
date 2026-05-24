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
    
    // Evitar cache para dados financeiros
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const apiKey = process.env.ABACATEPAY_API_KEY;

    try {
        // 1. Tentar sincronizar com a API do Abacate Pay se tivermos a chave
        if (apiKey) {
            try {
                const apiRes = await fetch('https://api.abacatepay.com/v2/checkouts/list', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                const apiData = await apiRes.json();
                
                if (apiData.success && apiData.data) {
                    // Sincronizar as cobranças que mudaram de status
                    for (const remote of apiData.data) {
                        if (remote.status === 'PAID') {
                            // Atualizar no nosso banco se estiver pendente
                            await supabase
                                .from('abacate_pay_billings')
                                .update({ 
                                    status: 'PAID',
                                    payment_method: remote.payment?.method || remote.methods?.[0] || 'PIX',
                                    updated_at: new Date().toISOString()
                                })
                                .eq('billing_id', remote.id);
                        }
                    }
                }
            } catch (syncErr) {
                console.error('[AbacateStats] Erro ao sincronizar com API:', syncErr);
            }
        }

        // 2. Buscar dados atualizados do banco
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

        // 3. Auto-healing: Verificar se existem cobranças pagas sem registro de venda
        if (paid.length > 0) {
            const paidIds = paid.map(b => b.billing_id).filter(Boolean);
            
            if (paidIds.length > 0) {
                const { data: existingSales } = await supabase
                    .from('sales')
                    .select('billing_id')
                    .in('billing_id', paidIds);
                
                const saleBillingIds = new Set(existingSales?.map(s => s.billing_id) || []);
                const orphans = paid.filter(b => !saleBillingIds.has(b.billing_id));

                if (orphans.length > 0) {
                    console.log(`[AbacateStats] Encontrados ${orphans.length} órfãos. Processando...`);
                    const { data: settingsRow } = await supabase.from('system_settings').select('*').eq('id', 1).single();
                    const defaultRate = settingsRow?.commission_default_rate || 0.06;
                    const customRates = settingsRow?.commission_custom_rates || {};
                    const defaultVideoRate = settingsRow?.commission_video_default_rate !== undefined && settingsRow?.commission_video_default_rate !== null ? settingsRow.commission_video_default_rate : 0.10;

                    for (const billing of orphans) {
                        let metadata = billing.metadata || {};
                        if (typeof metadata === 'string') {
                            try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
                        }
                        
                        const cartIds = metadata.cartIds || [];
                        const userId = metadata.userId || 'guest-id';

                        if (cartIds.length > 0) {
                            const { data: photos } = await supabase.from('photos').select('*').in('id', cartIds);
                            if (photos) {
                                for (const photo of photos) {
                                    const isVideo = photo.media_type === 'video';
                                    let rate;
                                    if (isVideo) {
                                        rate = defaultVideoRate;
                                    } else {
                                        rate = customRates[photo.photographer_id] !== undefined ? customRates[photo.photographer_id] : defaultRate;
                                    }
                                    await supabase.from('sales').insert({
                                        photo_id: photo.id,
                                        buyer_id: userId,
                                        price: photo.price,
                                        commission: photo.price * rate,
                                        commission_rate: rate,
                                        photographer_id: photo.photographer_id,
                                        billing_id: billing.billing_id,
                                        status: 'completed',
                                        is_available: true,
                                        available_at: new Date().toISOString(),
                                        sale_date: billing.updated_at || new Date().toISOString()
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        const totalPaid     = paid.reduce((s, b) => s + (b.amount || 0), 0);
        const totalPending  = pending.reduce((s, b) => s + (b.amount || 0), 0);
        const totalRefunded = refunded.reduce((s, b) => s + (b.amount || 0), 0);

        const totalPix  = paid.filter(b => b.payment_method === 'PIX').reduce((s, b) => s + (b.amount || 0), 0);
        const totalCard = paid.filter(b => b.payment_method === 'CARD').reduce((s, b) => s + (b.amount || 0), 0);

        // 4. Buscar comissões acumuladas (Lucro FotoClic) das vendas pagas
        const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select('commission')
            .in('billing_id', paid.map(b => b.billing_id));

        const totalCommission = salesError ? 0 : sales.reduce((s, b) => s + (b.commission || 0), 0);

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
                total_commission: Math.round(totalCommission * 100),
                balance: Math.max(0, Math.round(totalPaid - totalRefunded)),
            },
        });

    } catch (error) {
        console.error('[AbacateStats] Erro:', error);
        return res.status(500).json({ error: 'Erro ao buscar estatísticas da Abacate Pay.' });
    }
}
