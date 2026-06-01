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
        const defaultVideoRate = settingsRow?.commission_video_default_rate !== undefined && settingsRow?.commission_video_default_rate !== null ? settingsRow.commission_video_default_rate : 0.10;

        for (const billing of orphans) {
            const metadata = billing.metadata || {};
            const cartIds = metadata.cartIds || [];

            if (cartIds.length > 0) {
                const { data: photos } = await supabase.from('photos').select('*').in('id', cartIds);
                
                if (photos && photos.length > 0) {
                    for (const photo of photos) {
                        const isVideo = photo.media_type === 'video';
                        let rate;
                        if (isVideo) {
                            rate = defaultVideoRate;
                        } else {
                            rate = customRates[photo.photographer_id] !== undefined ? customRates[photo.photographer_id] : defaultRate;
                        }
                        


                        const { error: saleError } = await supabase.from('sales').upsert({
                            photo_id: photo.id,
                            buyer_id: user.id,
                            price: photo.price,
                            commission: Math.min(photo.price, (photo.price * rate) + 0.80),
                            commission_rate: rate,
                            photographer_id: photo.photographer_id,
                            billing_id: billing.billing_id,
                            status: 'completed',
                            is_available: true,
                            available_at: new Date().toISOString(),
                            sale_date: billing.updated_at || new Date().toISOString()
                        }, { onConflict: 'photo_id, buyer_id', ignoreDuplicates: true });

                        if (!saleError) {
                            createdCount++;
                        } else {
                            console.warn(`[Sync] Upsert ignorou duplicata ou erro para foto ${photo.id}:`, saleError.message);
                        }
                    }
                    // Obter dados dos fotógrafos
                    const photographerIds = [...new Set(photos.map(p => p.photographer_id))];
                    const { data: photographersData } = await supabase
                        .from('users')
                        .select('id, name, email')
                        .in('id', photographerIds);
                    
                    const photographerMap = (photographersData || []).reduce((acc, p) => {
                        acc[p.id] = p;
                        return acc;
                    }, {});

                    // 1.5 Buscar Configurações e Templates do Banco
                    const { data: settingsRow } = await supabase
                        .from('system_settings')
                        .select('*')
                        .eq('id', 1)
                        .single();

                    // --- LIMPEZA DO CARRINHO (BACKEND) ---
                    try {
                        const photoIds = photos.map(p => p.id);
                        const { data: cartData } = await supabase.from('carts').select('items').eq('user_id', user.id).maybeSingle();
                        if (cartData && cartData.items) {
                            const newCartItems = cartData.items.filter(id => !photoIds.includes(id));
                            await supabase.from('carts').update({ items: newCartItems }).eq('user_id', user.id);
                            console.log(`[Sync] Carrinho do cliente ${user.id} limpo com sucesso.`);
                        }
                    } catch (cartErr) {
                        console.error('[Sync] Erro ao limpar carrinho:', cartErr);
                    }

                    const photographerSalesMap = {};
                    const defaultRate = settingsRow?.commission_default_rate || 0.06;
                    const customRates = settingsRow?.commission_custom_rates || {};
                    const defaultVideoRate = settingsRow?.commission_video_default_rate !== undefined && settingsRow?.commission_video_default_rate !== null ? settingsRow.commission_video_default_rate : 0.10;

                    for (const photo of photos) {
                        if (!photographerSalesMap[photo.photographer_id]) {
                            photographerSalesMap[photo.photographer_id] = {
                                photographer: photographerMap[photo.photographer_id],
                                totalCommission: 0,
                                photos: []
                            };
                        }
                        const isVideo = photo.media_type === 'video';
                        let rate;
                        if (isVideo) {
                            rate = defaultVideoRate;
                        } else {
                            rate = customRates[photo.photographer_id] !== undefined ? customRates[photo.photographer_id] : defaultRate;
                        }
                        const commissionValue = photo.price * rate;

                        photographerSalesMap[photo.photographer_id].totalCommission += commissionValue;
                        photographerSalesMap[photo.photographer_id].photos.push({
                            title: photo.title,
                            price: photo.price,
                            commission: commissionValue,
                            preview_url: photo.preview_url
                        });
                    }
                          let buyerEmailLog = null;
                    const photographerEmailsLog = [];

                    // --- Enviar Email de Confirmação para o Comprador ---
                    try {
                        console.log('[Sync] Iniciando envio de email para:', user.email);
                        
                        // 1. Buscar Nome Real do Usuário na tabela public.users
                        const { data: dbUser } = await supabase
                            .from('users')
                            .select('name')
                            .eq('id', user.id)
                            .single();
                        
                        const customerName = dbUser?.name || user.user_metadata?.name || 'Cliente';

                        // 2. Buscar Templates do Banco (já feito acima)
                        const templates = settingsRow?.email_templates || {};
                        const template = templates.purchaseConfirmation || {
                            subject: '✅ Suas fotos estão disponíveis! - FotoClic',
                            body: 'Olá {{nome_cliente}}!\n\nSuas fotos compradas foram sincronizadas com sucesso.\n\nFotos:\n{{lista_fotos}}\n\nObrigado por escolher o FotoClic!'
                        };

                        // 3. Preparar Variáveis
                        const photoListHtml = photos.map(p => `
                            <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 10px; background: #f9fafb; border-radius: 8px; border: 1px solid #edf2f7;">
                                <img src="${p.preview_url}" width="60" height="60" style="object-fit: cover; border-radius: 4px; margin-right: 12px; border: 1px solid #e2e8f0;" />
                                <div>
                                    <div style="font-weight: bold; color: #2d3748; font-size: 14px;">${p.title || 'Foto'}</div>
                                    <div style="color: #718096; font-size: 12px;">Preço: R$ ${p.price.toFixed(2).replace('.', ',')}</div>
                                </div>
                            </div>
                        `).join('');
                        
                        const photoListText = photos.map(p => `- ${p.title || 'Foto'}: R$ ${p.price.toFixed(2).replace('.', ',')}`).join('\n');
                        const totalAmount = photos.reduce((sum, p) => sum + p.price, 0).toFixed(2).replace('.', ',');

                        const replacements = {
                            'nome_cliente': customerName,
                            'valor_total': totalAmount,
                            'quantidade_fotos': photos.length.toString(),
                            'lista_fotos': photoListText
                        };

                        // 4. Substituir Placeholders
                        let subject = template.subject || 'Sua compra foi confirmada!';
                        let body = template.body || '';
                        
                        Object.entries(replacements).forEach(([key, val]) => {
                            subject = subject.split(`{{${key}}}`).join(val);
                            body = body.split(`{{${key}}}`).join(val);
                        });

                        // 5. Montar HTML Final (Injetando a lista HTML no lugar da de texto se necessário)
                        let bodyHtml = body;
                        if (body.includes(photoListText)) {
                            bodyHtml = body.replace(photoListText, `<ul style="padding-left: 20px; color: #1e293b;">${photoListHtml}</ul>`);
                        }

                        const finalHtml = `
                            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                                <div style="background-color: #FF6B00; padding: 32px 20px; text-align: center;">
                                    <h1 style="color: white; margin: 0; font-size: 24px;">Compra Confirmada!</h1>
                                </div>
                                <div style="padding: 32px 24px;">
                                    <div style="font-size: 16px; line-height: 1.6; color: #475569; white-space: pre-wrap;">${bodyHtml}</div>
                                    <div style="text-align: center; margin: 40px 0;">
                                        <a href="${process.env.VITE_SITE_URL || 'https://fotoclic.com.br'}/minhas-compras" style="background-color: #FF6B00; color: white; padding: 14px 32px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">
                                            Acessar Minhas Fotos
                                        </a>
                                    </div>
                                </div>
                            </div>`;

                        const resendRes = await fetch('https://api.resend.com/emails', {
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

                        const resendData = await resendRes.json();
                        if (resendRes.ok) {
                            console.log('[Sync] Email enviado com sucesso ao comprador:', resendData.id);
                            buyerEmailLog = { success: true, id: resendData.id, to: user.email };
                        } else {
                            console.error('[Sync] Erro na API do Resend (Comprador):', resendData);
                            buyerEmailLog = { success: false, error: resendData, to: user.email };
                        }
                    } catch (emailErr) {
                        console.error('[Sync] Erro fatal ao enviar email de confirmação ao comprador:', emailErr);
                        buyerEmailLog = { success: false, error: emailErr.message || emailErr, to: user.email };
                    }

                    // --- Enviar Email para os Fotógrafos ---
                    for (const [pId, saleData] of Object.entries(photographerSalesMap)) {
                        if (saleData.photographer && saleData.photographer.email) {
                            try {
                                const totalPhotogNet = saleData.photos.reduce((acc, p) => acc + (p.price - p.commission), 0);

                                const photoListHtmlPhotog = saleData.photos.map(p => {
                                    const photogNet = p.price - p.commission;
                                    return `
                                    <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 10px; background: #f9fafb; border-radius: 8px; border: 1px solid #edf2f7;">
                                        <img src="${p.preview_url}" width="60" height="60" style="object-fit: cover; border-radius: 4px; margin-right: 12px; border: 1px solid #e2e8f0;" />
                                        <div>
                                            <div style="font-weight: bold; color: #2d3748; font-size: 14px;">${p.title || 'Foto'}</div>
                                            <div style="color: #718096; font-size: 12px;">Venda: R$ ${p.price.toFixed(2).replace('.', ',')} | Receber da Foto: <strong style="color: #059669;">R$ ${photogNet.toFixed(2).replace('.', ',')}</strong></div>
                                        </div>
                                    </div>
                                    `;
                                }).join('');
                                
                                const siteUrl = process.env.VITE_SITE_URL || 'https://fotoclic.com.br';
                                const finalHtmlPhotog = `
                                    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                                        <div style="background-color: #059669; padding: 32px 20px; text-align: center;">
                                            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Nova Venda Realizada!</h1>
                                        </div>
                                        <div style="padding: 32px 24px;">
                                            <p style="font-size: 16px;">Olá, <strong>${saleData.photographer.name || 'Fotógrafo'}</strong>!</p>
                                            <p style="font-size: 16px; color: #475569;">Excelentes notícias! Você acabou de realizar <strong>${saleData.photos.length} venda(s)</strong> no FotoClic.</p>
                                            
                                            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center;">
                                                <p style="margin: 0; color: #065f46; font-size: 14px;">Valor a Receber (Sem taxa do Gateway)</p>
                                                <p style="margin: 4px 0 0 0; color: #047857; font-size: 28px; font-weight: bold;">R$ ${totalPhotogNet.toFixed(2).replace('.', ',')}</p>
                                            </div>

                                            <h3 style="color: #1e293b; margin-top: 24px;">Fotos Vendidas:</h3>
                                            ${photoListHtmlPhotog}

                                            <p style="font-size: 13px; color: #64748b; margin-top: 24px; padding: 12px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid #0ea5e9;">
                                                <strong>Importante:</strong> Além da taxa do FotoClic que já foi descontada, no momento do <strong>saque</strong> na Central Financeira será deduzida a taxa do provedor de processamento de pagamentos (taxas relativas a Pix e Cartão).
                                            </p>

                                            <div style="text-align: center; margin: 40px 0;">
                                                <a href="${siteUrl}/photographer-dashboard" style="background-color: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">
                                                    Ver Central Financeira
                                                </a>
                                            </div>
                                        </div>
                                        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                                            © ${new Date().getFullYear()} FotoClic Marketplace. Todos os direitos reservados.
                                        </div>
                                    </div>`;

                                console.log('[Sync] Enviando e-mail para Fotógrafo:', saleData.photographer.email);
                                const resendRes = await fetch('https://api.resend.com/emails', {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        from: 'FotoClic <nao-responda@fotoclic.com.br>',
                                        to: saleData.photographer.email,
                                        subject: '🎉 Você realizou uma nova venda no FotoClic!',
                                        html: finalHtmlPhotog
                                    }),
                                });

                                const resendData = await resendRes.json();
                                if (resendRes.ok) {
                                    photographerEmailsLog.push({ success: true, id: resendData.id, to: saleData.photographer.email });
                                } else {
                                    photographerEmailsLog.push({ success: false, error: resendData, to: saleData.photographer.email });
                                }
                            } catch (err) {
                                console.error('[Sync] Erro ao enviar email para o fotografo:', err);
                                photographerEmailsLog.push({ success: false, error: err.message || err, to: saleData.photographer.email });
                            }
                        }
                    }

                    // --- REGISTRAR STATUS DE ENVIOS NO METADATA ---
                    try {
                        const emailLogs = {
                            email_dispatched_at: new Date().toISOString(),
                            buyer_email_log: buyerEmailLog,
                            photographer_emails_log: photographerEmailsLog
                        };
                        
                        await supabase
                            .from('abacate_pay_billings')
                            .update({
                                metadata: {
                                    ...(metadata || {}),
                                    email_logs: emailLogs
                                }
                            })
                            .eq('billing_id', billing.billing_id);
                        console.log('[Sync] Logs de email gravados no Supabase.');
                    } catch (metaErr) {
                        console.error('[Sync] Erro ao gravar metadata de emails:', metaErr);
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
