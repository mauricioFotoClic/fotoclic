import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Não autorizado.' });

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ error: 'Sessão inválida.' });
    }

    try {
        const apiKey = process.env.ABACATEPAY_API_KEY;

        // 1. Antes de tudo, buscar cobranças PENDENTES deste usuário para tentar "curá-las" via API
        const { data: pendingBillings } = await supabase
            .from('abacate_pay_billings')
            .select('*')
            .eq('status', 'PENDING')
            .or(`metadata->>userId.eq.${user.id},customer_email.eq.${user.email}`);

        if (pendingBillings && pendingBillings.length > 0 && apiKey) {
            try {
                const apiRes = await fetch('https://api.abacatepay.com/v2/checkouts/list', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                const apiData = await apiRes.json();
                
                if (apiData.success && apiData.data) {
                    for (const pending of pendingBillings) {
                        const remote = apiData.data.find(r => r.id === pending.billing_id);
                        if (remote && remote.status === 'PAID') {
                            console.log(`[Sync] Curando cobrança ${pending.billing_id} para PAID via API.`);
                            await supabase
                                .from('abacate_pay_billings')
                                .update({ 
                                    status: 'PAID', 
                                    payment_method: remote.payment?.method || 'PIX',
                                    updated_at: new Date().toISOString()
                                })
                                .eq('billing_id', pending.billing_id);
                        }
                    }
                }
            } catch (apiErr) {
                console.error('[Sync] Falha ao consultar API do Abacate Pay:', apiErr);
            }
        }

        // 2. Buscar todas as cobranças PAGAS deste usuário (incluindo as que acabamos de curar)
        const { data: billings, error: bError } = await supabase
            .from('abacate_pay_billings')
            .select('*')
            .eq('status', 'PAID')
            .or(`metadata->>userId.eq.${user.id},customer_email.eq.${user.email}`);

        if (bError) throw bError;

        if (!billings || billings.length === 0) {
            return res.status(200).json({ message: 'Tudo sincronizado.', count: 0 });
        }

        // 2. Buscar vendas existentes para este usuário para evitar duplicidade
        const { data: existingSales, error: sError } = await supabase
            .from('sales')
            .select('billing_id')
            .eq('buyer_id', user.id);

        if (sError) throw sError;

        const saleBillingIds = new Set(existingSales.map(s => s.billing_id));
        const orphans = billings.filter(b => !saleBillingIds.has(b.billing_id));

        if (orphans.length === 0) {
            return res.status(200).json({ message: 'Tudo sincronizado.', count: 0 });
        }

        // 3. Processar órfãos (similar ao webhook)
        let createdCount = 0;
        const { data: settingsRow } = await supabase.from('system_settings').select('*').eq('id', 1).single();
        const defaultRate = settingsRow?.commission_default_rate || 0.06;
        const customRates = settingsRow?.commission_custom_rates || {};

        for (const billing of orphans) {
            const metadata = billing.metadata || {};
            const cartIds = metadata.cartIds || [];

            if (cartIds.length > 0) {
                const { data: photos } = await supabase.from('photos').select('*').in('id', cartIds);
                
                if (photos && photos.length > 0) {
                    for (const photo of photos) {
                        let rate = customRates[photo.photographer_id] !== undefined ? customRates[photo.photographer_id] : defaultRate;
                        
                        await supabase.from('sales').insert({
                            photo_id: photo.id,
                            buyer_id: user.id,
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
                        createdCount++;
                    }

                    // --- Enviar Email de Confirmação (Backup Sync) ---
                    try {
                        const photoListHtml = photos.map(p => 
                            `<li style="margin-bottom: 8px;"><strong>${p.title || 'Foto'}</strong> - R$ ${p.price.toFixed(2).replace('.', ',')}</li>`
                        ).join('');

                        await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                from: 'FotoClic <nao-responda@fotoclic.com.br>',
                                to: user.email,
                                subject: '✅ Suas fotos estão disponíveis! - FotoClic',
                                html: `
                                    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                                        <div style="background-color: #FF6B00; padding: 32px 20px; text-align: center;">
                                            <h1 style="color: white; margin: 0; font-size: 24px;">Compra Confirmada!</h1>
                                        </div>
                                        <div style="padding: 32px 24px;">
                                            <p style="font-size: 16px;">Olá, <strong>${user.user_metadata?.name || 'Cliente'}</strong>!</p>
                                            <p>Suas fotos compradas foram sincronizadas com sucesso e já podem ser baixadas.</p>
                                            
                                            <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0;">
                                                <h3 style="margin-top: 0; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">Fotos Sincronizadas</h3>
                                                <ul style="padding-left: 20px; color: #475569;">
                                                    ${photoListHtml}
                                                </ul>
                                            </div>

                                            <div style="text-align: center; margin: 40px 0;">
                                                <a href="${process.env.VITE_SITE_URL || 'https://fotoclic.com.br'}/minhas-compras" style="background-color: #FF6B00; color: white; padding: 14px 32px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">
                                                    Acessar Minhas Fotos
                                                </a>
                                            </div>
                                        </div>
                                    </div>`
                            }),
                        });
                    } catch (emailErr) {
                        console.error('[Sync] Erro ao enviar email de confirmação:', emailErr);
                    }
                }
            }
        }

        return res.status(200).json({ message: 'Sincronização concluída.', count: createdCount });
    } catch (err) {
        console.error('Erro no sync-purchases:', err);
        return res.status(500).json({ error: 'Falha na sincronização.' });
    }
}
