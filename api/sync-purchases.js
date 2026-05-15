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

                    // --- Enviar Email de Confirmação (Dinamizado pelo Banco e com Nome Real) ---
                    try {
                        // 1. Buscar Nome Real do Usuário na tabela public.users
                        const { data: dbUser } = await supabase
                            .from('users')
                            .select('name')
                            .eq('id', user.id)
                            .single();
                        
                        const customerName = dbUser?.name || user.user_metadata?.name || 'Cliente';

                        // 2. Buscar Templates do Banco
                        const { data: settingsRow } = await supabase
                            .from('system_settings')
                            .select('email_templates')
                            .eq('id', 1)
                            .single();
                        
                        const templates = settingsRow?.email_templates || {};
                        const template = templates.purchaseConfirmation || {
                            subject: '✅ Suas fotos estão disponíveis! - FotoClic',
                            body: 'Olá {{nome_cliente}}!\n\nSuas fotos compradas foram sincronizadas com sucesso.\n\nFotos:\n{{lista_fotos}}\n\nObrigado por escolher o FotoClic!'
                        };

                        // 3. Preparar Variáveis
                        const photoListText = photos.map(p => `- ${p.title || 'Foto'}: R$ ${p.price.toFixed(2).replace('.', ',')}`).join('\n');
                        const photoListHtml = photos.map(p => `
                            <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 10px; background: #f9fafb; border-radius: 8px; border: 1px solid #edf2f7;">
                                <img src="${p.preview_url}" width="60" height="60" style="object-fit: cover; border-radius: 4px; margin-right: 12px; border: 1px solid #e2e8f0;" />
                                <div>
                                    <div style="font-weight: bold; color: #2d3748; font-size: 14px;">${p.title || 'Foto'}</div>
                                    <div style="color: #718096; font-size: 12px;">Preço: R$ ${p.price.toFixed(2).replace('.', ',')}</div>
                                </div>
                            </div>
                        `).join('');
                        const totalAmount = photos.reduce((sum, p) => sum + p.price, 0).toFixed(2).replace('.', ',');

                        const replacements = {
                            'nome_cliente': customerName,
                            'valor_total': totalAmount,
                            'quantidade_fotos': photos.length.toString(),
                            'lista_fotos': photoListText
                        };

                        // 4. Substituir Placeholders
                        let subject = template.subject;
                        let body = template.body;
                        
                        Object.entries(replacements).forEach(([key, val]) => {
                            subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), val);
                            body = body.replace(new RegExp(`{{${key}}}`, 'g'), val);
                        });

                        // 5. Montar HTML Final (Envolvendo o texto do banco em um layout bonito)
                        const finalHtml = `
                            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                                <div style="background-color: #FF6B00; padding: 32px 20px; text-align: center;">
                                    <h1 style="color: white; margin: 0; font-size: 24px;">Compra Confirmada!</h1>
                                </div>
                                <div style="padding: 32px 24px;">
                                    <div style="font-size: 16px; line-height: 1.6; color: #475569; white-space: pre-wrap;">
${body.replace(photoListText, `<ul style="padding-left: 20px; color: #1e293b;">${photoListHtml}</ul>`)}
                                    </div>
                                    <div style="text-align: center; margin: 40px 0;">
                                        <a href="${process.env.VITE_SITE_URL || 'https://fotoclic.com.br'}/minhas-compras" style="background-color: #FF6B00; color: white; padding: 14px 32px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">
                                            Acessar Minhas Fotos
                                        </a>
                                    </div>
                                </div>
                            </div>`;

                        await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                from: 'FotoClic <nao-responda@fotoclic.com.br>',
                                to: user.email,
                                subject: subject,
                                html: finalHtml
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
