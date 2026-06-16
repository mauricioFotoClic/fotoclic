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
    // Evitar cache para dados financeiros
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (req.method === 'POST') {
        try {
            const { amount, note, external_id, withdraw_date, adjustment } = req.body;
            
            // Tratar ajuste manual do saldo
            if (adjustment !== undefined) {
                const { data: settings, error: readError } = await supabase
                    .from('system_settings')
                    .select('*')
                    .eq('id', 1)
                    .single();

                if (readError) throw readError;

                const customRates = settings.commission_custom_rates || {};
                
                const { error: updateError } = await supabase
                    .from('system_settings')
                    .update({
                        commission_custom_rates: {
                            ...customRates,
                            __adjustment: Math.round(Number(adjustment))
                        }
                    })
                    .eq('id', 1);

                if (updateError) throw updateError;

                return res.status(200).json({ success: true, adjustment });
            }

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Valor do saque inválido.' });
            }

            const { data: settings, error: readError } = await supabase
                .from('system_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (readError) throw readError;

            const customRates = settings.commission_custom_rates || {};
            const withdrawals = customRates.__withdrawals || [];

            const newWithdrawal = {
                id: `withdraw_${Math.random().toString(36).substring(2, 9)}`,
                amount: Math.round(Number(amount)), // em centavos
                status: 'completed',
                withdraw_date: withdraw_date || new Date().toISOString(),
                external_id: external_id || `man_${Date.now()}`,
                note: note || 'Saque registrado manual.'
            };

            if (external_id && withdrawals.some(w => w.external_id === external_id)) {
                return res.status(400).json({ error: 'Este saque (ID de transação) já foi registrado.' });
            }

            withdrawals.push(newWithdrawal);

            const { error: updateError } = await supabase
                .from('system_settings')
                .update({
                    commission_custom_rates: {
                        ...customRates,
                        __withdrawals: withdrawals
                    }
                })
                .eq('id', 1);

            if (updateError) throw updateError;

            return res.status(200).json({ success: true, withdrawal: newWithdrawal });
        } catch (err) {
            console.error('[AbacateStats] Erro no POST:', err);
            return res.status(500).json({ error: 'Erro ao registrar saque.' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) {
                return res.status(400).json({ error: 'ID do saque não fornecido.' });
            }

            const { data: settings, error: readError } = await supabase
                .from('system_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (readError) throw readError;

            const customRates = settings.commission_custom_rates || {};
            const withdrawals = customRates.__withdrawals || [];

            const updatedWithdrawals = withdrawals.filter(w => w.id !== id && w.external_id !== id);

            const { error: updateError } = await supabase
                .from('system_settings')
                .update({
                    commission_custom_rates: {
                        ...customRates,
                        __withdrawals: updatedWithdrawals
                    }
                })
                .eq('id', 1);

            if (updateError) throw updateError;

            return res.status(200).json({ success: true });
        } catch (err) {
            console.error('[AbacateStats] Erro no DELETE:', err);
            return res.status(500).json({ error: 'Erro ao excluir saque.' });
        }
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const apiKey = process.env.ABACATEPAY_API_KEY;

    let apiBalance = null;
    let apiConnected = false;
    let apiError = null;

    try {
        if (apiKey) {
            // 1. Tentar sincronizar com a API do Abacate Pay (checkouts)
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
                console.error('[AbacateStats] Erro ao sincronizar checkouts com API:', syncErr);
            }

            // 2. Tentar obter o saldo da loja via API automaticamente
            try {
                const storeRes = await fetch('https://api.abacatepay.com/v2/stores/get', {
                    headers: { 
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (storeRes.ok) {
                    const storeData = await storeRes.json();
                    if (storeData.success && storeData.data && storeData.data.balance) {
                        apiBalance = storeData.data.balance;
                        apiConnected = true;
                    } else {
                        apiError = storeData.error || 'Não foi possível ler o saldo na resposta da API.';
                    }
                } else {
                    const errData = await storeRes.json().catch(() => ({}));
                    apiError = errData.error || `HTTP ${storeRes.status}`;
                }
            } catch (storeErr) {
                console.error('[AbacateStats] Erro ao consultar saldo na API:', storeErr);
                apiError = storeErr.message;
            }
        } else {
            apiError = 'Chave de API não configurada (ABACATEPAY_API_KEY ausente).';
        }

        // 3. Buscar dados atualizados do banco
        const { data: billings, error } = await supabase
            .from('abacate_pay_billings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) {
            if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
                return res.status(200).json({ billings: [], stats: emptyStats(), api_balance: null, api_connected: false, api_error: 'Tabela de cobranças não existe.' });
            }
            throw error;
        }

        const paid      = billings.filter(b => b.status === 'PAID');
        const pending   = billings.filter(b => b.status === 'PENDING');
        const cancelled = billings.filter(b => b.status === 'CANCELLED');
        const refunded  = billings.filter(b => b.status === 'REFUNDED');

        // 4. Auto-healing: Verificar se existem cobranças pagas sem registro de venda
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
                            if (photos && photos.length > 0) {
                                const totalAmountReais = billing.amount / 100;
                                let gatewayFeeTotal = 0.50; // PIX
                                if (billing.payment_method === 'CARD') {
                                    gatewayFeeTotal = (totalAmountReais * 0.035) + 0.60;
                                }
                                const flatFeePerPhoto = gatewayFeeTotal / photos.length;
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
                                        commission: Math.min(photo.price, (photo.price * rate) + flatFeePerPhoto),
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

        // 5. Buscar comissões acumuladas (Lucro FotoClic) das vendas pagas
        const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select('commission')
            .in('billing_id', paid.map(b => b.billing_id));

        const totalCommission = salesError ? 0 : sales.reduce((s, b) => s + (b.commission || 0), 0);

        // 6. Buscar saques e ajustes de system_settings para retornar no GET
        const { data: settings } = await supabase
            .from('system_settings')
            .select('commission_custom_rates')
            .eq('id', 1)
            .single();

        const customRates = settings?.commission_custom_rates || {};
        const withdrawals = customRates.__withdrawals || [];
        const balanceAdjustment = customRates.__adjustment || 0;

        // 7. Buscar saques automáticos (payouts) da tabela payouts
        const { data: dbPayouts, error: payoutsError } = await supabase
            .from('payouts')
            .select('*')
            .eq('status', 'paid');

        if (payoutsError) {
            console.error('[AbacateStats] Erro ao buscar payouts:', payoutsError);
        }

        const payoutWithdrawals = [];
        if (dbPayouts && dbPayouts.length > 0) {
            // Buscar nomes dos fotógrafos
            const photographerIds = [...new Set(dbPayouts.map(p => p.photographer_id))].filter(Boolean);
            let photographerMap = {};
            if (photographerIds.length > 0) {
                const { data: pData } = await supabase
                    .from('users')
                    .select('id, name')
                    .in('id', photographerIds);
                if (pData) {
                    pData.forEach(p => {
                        photographerMap[p.id] = p.name;
                    });
                }
            }

            dbPayouts.forEach(p => {
                const photographerName = photographerMap[p.photographer_id] || 'Fotógrafo';
                payoutWithdrawals.push({
                    id: p.id,
                    amount: Math.round(Number(p.amount) * 100), // converter de R$ float para centavos
                    status: 'completed',
                    withdraw_date: p.processed_date || p.request_date || new Date().toISOString(),
                    external_id: p.external_id || `pay_${p.id}`,
                    note: `Repasse automático (Pix) para o fotógrafo ${photographerName}`,
                    is_automatic: true
                });
            });
        }

        // Mesclar saques manuais e repasses automáticos
        const allWithdrawals = [...withdrawals, ...payoutWithdrawals];
        allWithdrawals.sort((a, b) => new Date(b.withdraw_date) - new Date(a.withdraw_date));

        // Calcular total de saques efetuados da conta Abacate Pay (ignora payouts com external_id de bypass manual)
        const totalWithdrawals = allWithdrawals.reduce((sum, w) => {
            const isManualPayout = w.is_automatic && w.external_id && (w.external_id.startsWith('manual_') || w.external_id.startsWith('payout_manual_'));
            if (isManualPayout) {
                return sum;
            }
            return sum + (w.amount || 0);
        }, 0);

        return res.status(200).json({
            billings,
            withdrawals: allWithdrawals,
            api_balance: apiBalance,
            api_connected: apiConnected,
            api_error: apiError,
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
                total_withdrawals: totalWithdrawals,
                balance_adjustment: balanceAdjustment
            },
        });

    } catch (error) {
        console.error('[AbacateStats] Erro:', error);
        return res.status(500).json({ error: 'Erro ao buscar estatísticas da Abacate Pay.' });
    }
}
